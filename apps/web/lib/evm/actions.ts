import {
  getAccount,
  readContract,
  signTypedData,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/core'
import { type Address, erc20Abi, type Hash, parseAbi, parseSignature } from 'viem'
import { wagmiAdapter } from './appkit'

/**
 * What the EVM wallet is asked to do. Each function asks the connected wallet once; the person approves it there.
 * Plain async functions over wagmi's core actions, so a test or a swap can chain them step by step.
 */

function config() {
  if (!wagmiAdapter) throw new Error('EVM wallets need a Reown project ID (NEXT_PUBLIC_REOWN_PROJECT_ID)')
  return wagmiAdapter.wagmiConfig
}

export function connectedEvmAddress(): Address | undefined {
  return wagmiAdapter ? getAccount(config()).address : undefined
}

/** Puts the wallet on `chainId` first (one prompt, only when it is elsewhere). */
export async function ensureChain(chainId: number) {
  if (getAccount(config()).chainId !== chainId) await switchChain(config(), { chainId })
}

/** NEAR Intents deposit: a plain ERC-20 transfer to the quote's deposit address. */
export async function transferErc20(params: {
  chainId: number
  token: Address
  to: Address
  amount: bigint
}) {
  await ensureChain(params.chainId)
  return writeContract(config(), {
    chainId: params.chainId,
    address: params.token,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [params.to, params.amount],
  })
}

export function waitForReceipt(chainId: number, hash: Hash) {
  return waitForTransactionReceipt(config(), { chainId, hash })
}

/** THORChain step one: let the router pull the tokens, only if it may not already. */
export async function approveIfNeeded(params: {
  chainId: number
  token: Address
  owner: Address
  spender: Address
  amount: bigint
}): Promise<Hash | undefined> {
  const allowance = await readContract(config(), {
    chainId: params.chainId,
    address: params.token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [params.owner, params.spender],
  })
  if (allowance >= params.amount) return undefined
  await ensureChain(params.chainId)
  const hash = await writeContract(config(), {
    chainId: params.chainId,
    address: params.token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [params.spender, params.amount],
  })
  await waitForReceipt(params.chainId, hash)
  return hash
}

/** THORChain's router (docs: "router.depositWithExpiry(inbound_address, asset, amount, memo, expiry)"). */
const thorRouterAbi = parseAbi([
  'function depositWithExpiry(address vault, address asset, uint256 amount, string memo, uint256 expiration) payable',
])

export async function thorDeposit(params: {
  chainId: number
  router: Address
  vault: Address
  token: Address
  amount: bigint
  memo: string
  expiry: bigint
}) {
  await ensureChain(params.chainId)
  return writeContract(config(), {
    chainId: params.chainId,
    address: params.router,
    abi: thorRouterAbi,
    functionName: 'depositWithExpiry',
    args: [params.vault, params.token, params.amount, params.memo, params.expiry],
  })
}

/**
 * EIP-3009 `TransferWithAuthorization`, as USDC defines it (domain name "USD Coin", version "2"). The person signs;
 * Hashi's relayer submits it and pays the gas. Returns the signature split into v, r, s.
 */
export async function signUsdcTransferAuthorization(params: {
  chainId: number
  usdc: Address
  from: Address
  to: Address
  value: bigint
  validAfter: bigint
  validBefore: bigint
  nonce: Hash
}) {
  await ensureChain(params.chainId)
  const signature = await signTypedData(config(), {
    domain: { name: 'USD Coin', version: '2', chainId: params.chainId, verifyingContract: params.usdc },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
    },
  })
  const { r, s, yParity } = parseSignature(signature)
  return { signature, v: 27 + yParity, r, s }
}
