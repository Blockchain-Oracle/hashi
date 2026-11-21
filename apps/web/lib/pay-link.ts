import { formatUnits } from 'viem'
import type { StableAsset } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'

/**
 * A payment request a phone wallet opens with everything filled in: the coin, its network, the amount and where it
 * goes. EVM chains use EIP-681 (`ethereum:<token>@<chain id>/transfer?address=<to>&uint256=<base units>`), so a
 * wallet that reads it cannot pick the wrong network or coin; Solana uses a Solana Pay transfer request. A plain
 * address is the fallback for a chain with neither.
 */
export function paymentLink(stable: StableAsset, to: string, amount: bigint): string {
  const chain = CHAINS[stable.chain]
  if (chain.kind === 'evm' && chain.evmChainId)
    return `ethereum:${stable.address}@${chain.evmChainId}/transfer?address=${to}&uint256=${amount}`
  if (chain.kind === 'solana')
    return `solana:${to}?amount=${formatUnits(amount, stable.decimals)}&spl-token=${stable.address}`
  return to
}
