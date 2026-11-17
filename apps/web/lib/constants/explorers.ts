import { BCH_EXPLORER_TX_URL, type ChainId } from './chains'

/**
 * Where a transaction can be looked up. Each chain's standard explorer; NEAR Intents' own explorer is keyed by the
 * deposit address (its home page links that way), THORChain's by the inbound transaction hash. Checked
 * 2026-11-16: explorer.near-intents.org/transactions/<address> and thorchain.net/tx/<hash> answer 200.
 */
const TX_URL: Record<ChainId, string> = {
  bch: BCH_EXPLORER_TX_URL,
  base: 'https://basescan.org/tx/',
  ethereum: 'https://etherscan.io/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  optimism: 'https://optimistic.etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  avalanche: 'https://snowtrace.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

export function txUrl(chain: ChainId, hash: string): string {
  const id = chain === 'bch' ? hash.replace(/^0x/i, '').toLowerCase() : hash
  return `${TX_URL[chain]}${id}`
}

export function nearIntentsUrl(depositAddress: string): string {
  return `https://explorer.near-intents.org/transactions/${depositAddress}`
}

export function thorchainUrl(inboundHash: string): string {
  return `https://thorchain.net/tx/${inboundHash.replace(/^0x/i, '').toUpperCase()}`
}
