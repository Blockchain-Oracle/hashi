/**
 * The chains Hashi moves money between, and how each bridge provider names them.
 *
 * `nearBlockchain` is the `blockchain` field in NEAR Intents' token list (GET /v0/tokens);
 * `thorchainChain` is the chain prefix in THORChain's pool and inbound-address ids. Both were read live on 2026-11-16.
 * Which assets a provider supports on a chain lives in ./assets.ts; whether it is open right now is checked live.
 */

export type ChainKind = 'bch' | 'evm' | 'solana'

export interface ChainInfo {
  id: string
  name: string
  kind: ChainKind
  /** EIP-155 chain id, for EVM chains. */
  evmChainId?: number
  /** The coin that pays this chain's network fees, by the symbol NEAR Intents prices it under. */
  nativeSymbol: string
  nearBlockchain: string
  thorchainChain: string | null
}

export const CHAINS = {
  bch: {
    id: 'bch',
    name: 'Bitcoin Cash',
    nativeSymbol: 'BCH',
    kind: 'bch',
    nearBlockchain: 'bch',
    thorchainChain: 'BCH',
  },
  base: {
    id: 'base',
    name: 'Base',
    nativeSymbol: 'ETH',
    kind: 'evm',
    evmChainId: 8453,
    nearBlockchain: 'base',
    thorchainChain: 'BASE',
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    nativeSymbol: 'ETH',
    kind: 'evm',
    evmChainId: 1,
    nearBlockchain: 'eth',
    thorchainChain: 'ETH',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    nativeSymbol: 'ETH',
    kind: 'evm',
    evmChainId: 42161,
    nearBlockchain: 'arb',
    thorchainChain: null,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    nativeSymbol: 'ETH',
    kind: 'evm',
    evmChainId: 10,
    nearBlockchain: 'op',
    thorchainChain: null,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    nativeSymbol: 'POL',
    kind: 'evm',
    evmChainId: 137,
    nearBlockchain: 'pol',
    thorchainChain: null,
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    nativeSymbol: 'AVAX',
    kind: 'evm',
    evmChainId: 43114,
    nearBlockchain: 'avax',
    thorchainChain: 'AVAX',
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Chain',
    nativeSymbol: 'BNB',
    kind: 'evm',
    evmChainId: 56,
    nearBlockchain: 'bsc',
    thorchainChain: 'BSC',
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    nativeSymbol: 'SOL',
    kind: 'solana',
    nearBlockchain: 'sol',
    thorchainChain: 'SOL',
  },
} as const satisfies Record<string, ChainInfo>

export type ChainId = keyof typeof CHAINS

/** The chains a user brings stablecoins from (or receives them on). Bitcoin Cash is always the other side. */
export const EXTERNAL_CHAIN_IDS = [
  'base',
  'ethereum',
  'arbitrum',
  'optimism',
  'polygon',
  'avalanche',
  'bsc',
  'solana',
] as const satisfies readonly ChainId[]

export type ExternalChainId = (typeof EXTERNAL_CHAIN_IDS)[number]

/** Hashi runs on Bitcoin Cash mainnet only. */
export const BCH_ADDRESS_PREFIX = 'bitcoincash'

/** A CashTokens-aware block explorer that resolved real transactions on 2026-11-16 (Blockchair answered 401). */
export const BCH_EXPLORER_TX_URL = 'https://explorer.salemkode.com/tx/'
