import { z } from 'zod'
import { REOWN_RPC_URL, SOLANA_MAINNET_CAIP2 } from '@/lib/constants/providers'
import { env } from '@/lib/env'
import { fetchJson, ProviderError } from '@/lib/http'

/** Solana reads (balances, rent) through Reown's RPC, the one AppKit's Solana adapter already talks to. */

const PROVIDER = 'Solana RPC'

async function rpc<T extends z.ZodType>(
  method: string,
  params: unknown[],
  result: T,
  signal?: AbortSignal,
): Promise<z.infer<T>> {
  const projectId = env.NEXT_PUBLIC_REOWN_PROJECT_ID
  if (!projectId) throw new ProviderError(PROVIDER, 'No Reown project id is set')
  const url = `${REOWN_RPC_URL}?chainId=${SOLANA_MAINNET_CAIP2}&projectId=${projectId}`
  const response = await fetchJson(
    PROVIDER,
    url,
    z.object({ result: result.optional(), error: z.object({ message: z.string() }).optional() }),
    { method: 'POST', body: { jsonrpc: '2.0', id: 1, method, params }, ...(signal ? { signal } : {}) },
  )
  if (response.error || response.result === undefined) {
    throw new ProviderError(PROVIDER, response.error?.message ?? `${method} returned nothing`)
  }
  return response.result
}

const tokenAccounts = z.object({
  value: z.array(
    z.object({
      account: z.object({
        data: z.object({
          parsed: z.object({ info: z.object({ tokenAmount: z.object({ amount: z.string() }) }) }),
        }),
      }),
    }),
  ),
})

/** Every token account `owner` holds for `mint`, summed, in base units. */
export async function getSplBalance(owner: string, mint: string, signal?: AbortSignal): Promise<bigint> {
  const result = await rpc(
    'getTokenAccountsByOwner',
    [owner, { mint }, { encoding: 'jsonParsed' }],
    tokenAccounts,
    signal,
  )
  return result.value.reduce((sum, a) => sum + BigInt(a.account.data.parsed.info.tokenAmount.amount), 0n)
}

export async function getLamports(owner: string, signal?: AbortSignal): Promise<bigint> {
  const result = await rpc('getBalance', [owner], z.object({ value: z.number() }), signal)
  return BigInt(result.value)
}

/** The lamports an account of `bytes` must hold to be exempt from rent. */
export async function getRentExemption(bytes: number, signal?: AbortSignal): Promise<bigint> {
  return BigInt(await rpc('getMinimumBalanceForRentExemption', [bytes], z.number(), signal))
}
