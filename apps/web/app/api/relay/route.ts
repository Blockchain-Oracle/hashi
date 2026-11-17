import { createPublicClient, createWalletClient, type Hex, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { serverEnv } from '@/lib/env.server'
import { getNearStatus } from '@/lib/providers/near'
import {
  checkNearDeposit,
  checkStatic,
  createLimiter,
  RELAY_CHAIN_IDS,
  relayRequestSchema,
  usdcOn,
} from '@/lib/relay/policy'

/**
 * Hashi's gas relayer (feature 12: gasless USDC). A USDC-only newcomer signs an EIP-3009 authorisation; this route
 * checks it against `lib/relay/policy.ts`, simulates it, and submits `transferWithAuthorization`, paying the gas
 * (≈ $0.001 on Base). Without RELAYER_PRIVATE_KEY it answers 503 and the app falls back to a normal transfer.
 */

const usdcAbi = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
])

const perPayer = createLimiter(3, 10 * 60_000)
const perIp = createLimiter(10, 10 * 60_000)

function clients() {
  if (!serverEnv.RELAYER_PRIVATE_KEY) return undefined
  const account = privateKeyToAccount(serverEnv.RELAYER_PRIVATE_KEY as Hex)
  const transport = http(serverEnv.BASE_RPC_URL)
  return {
    account,
    publicClient: createPublicClient({ chain: base, transport }),
    walletClient: createWalletClient({ account, chain: base, transport }),
  }
}

/**
 * Enough Base ETH for dozens of relays: one `transferWithAuthorization` uses ≈ 90k gas, ≈ 0.0000006 ETH at
 * Base's usual gas price, so 0.00005 ETH covers about 80.
 */
const MIN_RELAYER_WEI = 50_000_000_000_000n

/** Whether the relayer is set up and funded, and the address that pays its gas (so it can be topped up). */
export async function GET() {
  const c = clients()
  const balance = c
    ? await c.publicClient.getBalance({ address: c.account.address }).catch(() => undefined)
    : undefined
  return Response.json({
    enabled: Boolean(c),
    funded: balance !== undefined && balance >= MIN_RELAYER_WEI,
    address: c?.account.address ?? null,
    chainIds: RELAY_CHAIN_IDS,
  })
}

export async function POST(request: Request) {
  const c = clients()
  if (!c) return Response.json({ error: 'The gas relayer is not set up' }, { status: 503 })

  const parsed = relayRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Malformed request' }, { status: 400 })
  const req = parsed.data

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!perIp(ip) || !perPayer(req.from.toLowerCase())) {
    return Response.json({ error: 'Too many requests; try again in a few minutes' }, { status: 429 })
  }

  const refusal = checkStatic(req, Math.floor(Date.now() / 1000))
  if (refusal) return Response.json({ error: refusal }, { status: 400 })

  const nearRefusal = checkNearDeposit(req, await getNearStatus(req.to))
  if (nearRefusal) return Response.json({ error: nearRefusal }, { status: 400 })

  const usdc = usdcOn(req.chainId)
  if (!usdc) return Response.json({ error: 'No USDC on this chain' }, { status: 400 })
  const token = usdc.address as Hex

  const used = await c.publicClient.readContract({
    address: token,
    abi: usdcAbi,
    functionName: 'authorizationState',
    args: [req.from as Hex, req.nonce as Hex],
  })
  if (used) return Response.json({ error: 'This authorisation was already used' }, { status: 409 })

  const args = [
    req.from as Hex,
    req.to as Hex,
    BigInt(req.value),
    BigInt(req.validAfter),
    BigInt(req.validBefore),
    req.nonce as Hex,
    req.v,
    req.r as Hex,
    req.s as Hex,
  ] as const
  try {
    const { request: call } = await c.publicClient.simulateContract({
      account: c.account,
      address: token,
      abi: usdcAbi,
      functionName: 'transferWithAuthorization',
      args,
    })
    const hash = await c.walletClient.writeContract(call)
    return Response.json({ hash })
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : 'The transfer would fail'
    return Response.json({ error: message }, { status: 400 })
  }
}
