import { BCH_ASSETS, type BchAssetId, type StableAsset, type StableSymbol } from '@/lib/constants/assets'
import type { ChainId } from '@/lib/constants/chains'
import type { Pair } from './types'

/** One side of a swap, as the screens show it. */
export interface SideAsset {
  symbol: StableSymbol | BchAssetId
  decimals: number
  chain: ChainId
  /** Set when this side is a stablecoin on another chain. */
  stable?: StableAsset
}

function bchSide(id: BchAssetId): SideAsset {
  return { symbol: id, decimals: BCH_ASSETS[id].decimals, chain: 'bch' }
}

function stableSide(stable: StableAsset): SideAsset {
  return { symbol: stable.symbol, decimals: stable.decimals, chain: stable.chain, stable }
}

/** What the person pays and what they receive, for any pair: bridged either way, or both on Bitcoin Cash. */
export function pairSides(pair: Pair): { pay: SideAsset; receive: SideAsset } {
  switch (pair.direction) {
    case 'in':
      return { pay: stableSide(pair.stable), receive: bchSide(pair.bchAsset) }
    case 'out':
      return { pay: bchSide(pair.bchAsset), receive: stableSide(pair.stable) }
    case 'local':
      return { pay: bchSide(pair.from), receive: bchSide(pair.to) }
  }
}

/** PUSD, MUSD and the stablecoins are worth about a dollar each; BCH is not. */
export function isDollarLike(symbol: SideAsset['symbol']): boolean {
  return symbol !== 'BCH'
}
