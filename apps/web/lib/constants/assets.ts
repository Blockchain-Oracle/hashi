import type { ExternalChainId } from './chains'

/**
 * Every asset Hashi shows. The stablecoin rows were read live on 2026-11-16 from NEAR Intents (GET /v0/tokens) and
 * THORChain (GET /thorchain/pools); contract addresses agree between the two. A row lists a provider only if that
 * provider lists the asset; whether the provider is open right now is checked live, never assumed.
 */

export type StableSymbol = 'USDC' | 'USDT'

export interface StableAsset {
  symbol: StableSymbol
  chain: ExternalChainId
  /** ERC-20 contract or SPL mint. */
  address: string
  decimals: number
  nearAssetId: string
  /** THORChain pool asset, or null when THORChain has no pool for it. */
  thorchainAsset: string | null
  /**
   * Gas for a transfer to a fresh address (a deposit address holds nothing yet, which costs more) and for an
   * approval, measured with `eth_estimateGas` on each chain on 2026-11-16. Null on Solana, which has no gas.
   */
  gas: { transfer: bigint; approve: bigint } | null
}

export const STABLES: readonly StableAsset[] = [
  {
    symbol: 'USDC',
    chain: 'base',
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    decimals: 6,
    nearAssetId: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
    thorchainAsset: 'BASE.USDC-0X833589FCD6EDB6E08F4C7C32D4F71B54BDA02913',
    gas: { transfer: 62_976n, approve: 56_252n },
  },
  {
    symbol: 'USDC',
    chain: 'ethereum',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    nearAssetId: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
    thorchainAsset: 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
    gas: { transfer: 63_066n, approve: 56_373n },
  },
  {
    symbol: 'USDT',
    chain: 'ethereum',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    nearAssetId: 'nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near',
    thorchainAsset: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
    gas: { transfer: 64_019n, approve: 48_948n },
  },
  {
    symbol: 'USDC',
    chain: 'arbitrum',
    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    decimals: 6,
    nearAssetId: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
    thorchainAsset: null,
    gas: { transfer: 63_744n, approve: 57_019n },
  },
  {
    symbol: 'USDC',
    chain: 'optimism',
    address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    decimals: 6,
    nearAssetId: 'nep245:v2_1.omni.hot.tg:10_A2ewyUyDp6qsue1jqZsGypkCxRJ',
    thorchainAsset: null,
    gas: { transfer: 62_976n, approve: 56_252n },
  },
  {
    symbol: 'USDT',
    chain: 'optimism',
    address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    decimals: 6,
    nearAssetId: 'nep245:v2_1.omni.hot.tg:10_359RPSJVdTxwTJT9TyGssr2rFoWo',
    thorchainAsset: null,
    gas: { transfer: 52_220n, approve: 46_764n },
  },
  {
    symbol: 'USDC',
    chain: 'polygon',
    address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    decimals: 6,
    nearAssetId: 'nep141:pol-0x3c499c542cef5e3811e1192ce70d8cc03d5c3359.omdep.near',
    thorchainAsset: null,
    gas: { transfer: 79_000n, approve: 67_215n },
  },
  {
    symbol: 'USDT',
    chain: 'polygon',
    address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    decimals: 6,
    nearAssetId: 'nep141:pol-0xc2132d05d31c914a87c6611c10748aeb04b58e8f.omdep.near',
    thorchainAsset: null,
    gas: { transfer: 80_179n, approve: 63_700n },
  },
  {
    symbol: 'USDC',
    chain: 'avalanche',
    address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    decimals: 6,
    nearAssetId: 'nep141:avax-0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e.omdep.near',
    thorchainAsset: 'AVAX.USDC-0XB97EF9EF8734C71904D8002F8B6BC66DD9C48A6E',
    // The same FiatToken contract as Base (identical approval gas); no holder answered a transfer estimate.
    gas: { transfer: 62_976n, approve: 56_252n },
  },
  {
    symbol: 'USDT',
    chain: 'avalanche',
    address: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    decimals: 6,
    nearAssetId: 'nep141:avax-0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7.omdep.near',
    thorchainAsset: 'AVAX.USDT-0X9702230A8EA53601F5CD2DC00FDBC13D4DF4A8C7',
    gas: { transfer: 61_939n, approve: 54_404n },
  },
  // BNB Chain's USDC and USDT use 18 decimals, unlike every other chain here.
  {
    symbol: 'USDC',
    chain: 'bsc',
    address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    decimals: 18,
    nearAssetId: 'nep141:bnb-0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d.omdep.near',
    thorchainAsset: 'BSC.USDC-0X8AC76A51CC950D9822D68B83FE1AD97B32CD580D',
    gas: { transfer: 59_639n, approve: 54_211n },
  },
  {
    symbol: 'USDT',
    chain: 'bsc',
    address: '0x55d398326f99059ff775485246999027b3197955',
    decimals: 18,
    nearAssetId: 'nep141:bnb-0x55d398326f99059ff775485246999027b3197955.omdep.near',
    thorchainAsset: 'BSC.USDT-0X55D398326F99059FF775485246999027B3197955',
    gas: { transfer: 51_948n, approve: 46_552n },
  },
  {
    symbol: 'USDC',
    chain: 'solana',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    nearAssetId: 'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near',
    thorchainAsset: null,
    gas: null,
  },
  {
    symbol: 'USDT',
    chain: 'solana',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    nearAssetId: 'nep141:sol-c800a4bd850783ccb82c2b2c7e84175443606352.omft.near',
    thorchainAsset: null,
    gas: null,
  },
]

export type BchAssetId = 'BCH' | 'PUSD' | 'MUSD'

export interface BchAsset {
  id: BchAssetId
  name: string
  decimals: number
  /** CashTokens category id, or null for BCH itself. */
  category: string | null
}

/** The Bitcoin Cash side: plain BCH, and the two BCH stablecoins, which trade only on Cauldron. */
export const BCH_ASSETS = {
  PUSD: {
    id: 'PUSD',
    name: 'ParyonUSD',
    decimals: 2,
    category: '2469acc5afa4b10cb5b5c04afb89c3a3ffd61c5da9c01e26d00951cae2a02544',
  },
  MUSD: {
    id: 'MUSD',
    name: 'MoriaUSD',
    decimals: 2,
    category: 'b38a33f750f84c5c169a6f23cb873e6e79605021585d4f3408789689ed87f366',
  },
  BCH: { id: 'BCH', name: 'Bitcoin Cash', decimals: 8, category: null },
} as const satisfies Record<BchAssetId, BchAsset>

/** How the bridge providers name plain BCH. */
export const NEAR_BCH_ASSET_ID = 'nep141:bch.omft.near'
export const THORCHAIN_BCH_ASSET = 'BCH.BCH'
