import type { BchAssetId, StableAsset } from '@/lib/constants/assets'

/** The bridges: they carry value between another chain and Bitcoin Cash. */
export type ProviderId = 'near' | 'thorchain'

/** Who carries a route: a bridge (with Cauldron for PUSD and MUSD), or Cauldron alone when both sides are on Bitcoin Cash. */
export type RouteVia = ProviderId | 'cauldron'

export const PROVIDERS: Record<RouteVia, { name: string; short: string }> = {
  near: { name: 'NEAR Intents', short: 'NEAR' },
  thorchain: { name: 'THORChain', short: 'THORChain' },
  cauldron: { name: 'Cauldron', short: 'Cauldron' },
}

/** `in`: a stablecoin elsewhere → the Bitcoin Cash side. `out`: the Bitcoin Cash side → a stablecoin elsewhere. */
export type BridgeDirection = 'in' | 'out'

/** `local`: both sides on Bitcoin Cash (PUSD, MUSD, BCH), traded on Cauldron alone; no bridge. */
export type Direction = BridgeDirection | 'local'

export interface BridgePair {
  direction: BridgeDirection
  stable: StableAsset
  bchAsset: BchAssetId
}

export interface LocalPair {
  direction: 'local'
  from: BchAssetId
  to: BchAssetId
}

export type Pair = BridgePair | LocalPair

export function isLocal(pair: Pair): pair is LocalPair {
  return pair.direction === 'local'
}

export interface QuoteRequest<P extends Pair = Pair> {
  pair: P
  /** What the person pays, in the paying asset's base units. */
  amount: bigint
  slippageBps: number
  /** Real addresses once wallets are connected; without them the quote is a price only (dry). */
  addresses?: SwapAddresses
}

/** The person's addresses. A swap that stays on Bitcoin Cash has no stablecoin side. */
export interface SwapAddresses {
  stableSide?: string
  bchPlain: string
  bchToken: string
}

export interface CauldronLeg {
  pools: number
  /** Sats going into (buy) or coming out of (sell) the pools, before fees. Zero for a token-for-token trade. */
  tradeSats: bigint
  routerFeeSats: bigint
  /** Token-for-token trades: the Router's fee, in the sold token's base units, paid on top of the amount sold. */
  feeTokens?: bigint
  minerFeeSats: bigint
  /** Sats per token base unit before the trade (the paid token, in a token-for-token trade). */
  marketPrice?: string
  /** Token-for-token trades: sats per base unit of the received token. */
  receiveMarketPrice?: string
  /** True when the Router could fill only part of the trade. */
  partial: boolean
}

export interface Route {
  provider: RouteVia
  pair: Pair
  amountIn: bigint
  /** Received, after every fee, in the receiving asset's base units. */
  amountOut: bigint
  /** The least the person receives if prices move within their slippage. */
  minAmountOut: bigint
  /** BCH that crosses the bridge, in sats (zero on a Cauldron-only route: nothing crosses). */
  bridgeSats: bigint
  cauldron?: CauldronLeg
  /** What NEAR says the amounts are worth, when it says (forward and reverse). */
  usdIn?: number
  usdOut?: number
  etaSeconds: number
  /** Approvals the person gives across both wallets. */
  signatures: number
  quotedAt: number
  /** Unix ms after which the quote must be refreshed. */
  expiresAt?: number
  /** Every provider response, for /lab and for disputes (NEAR asks that its signed quote be kept). */
  raw: { bridge: unknown; cauldron?: unknown }
}

export type Unavailable = 'halted' | 'below-minimum' | 'unsupported' | 'no-liquidity' | 'error'

export type RouteOutcome =
  | { ok: true; route: Route }
  | { ok: false; provider: RouteVia; reason: Unavailable; message: string; minimum?: bigint }
