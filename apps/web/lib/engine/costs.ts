import type { StableAsset } from '@/lib/constants/assets'
import { BCH_SEND_FEE_SATS, THORCHAIN_DEPOSIT_GAS } from '@/lib/constants/fees'
import type { ProviderId, Route } from './types'
import { isLocal } from './types'

/**
 * What a route really costs, in dollars, line by line. Every number comes from the route itself (the providers'
 * own amounts and Cauldron's market price) and from live coin prices; nothing is assumed, not even that a
 * stablecoin is worth exactly $1.
 */

/** USD prices by symbol, from NEAR Intents' token list: USDC, USDT, BCH and every chain's fee coin. */
export type UsdPrices = Readonly<Record<string, number>>

const SATS_PER_BCH = 1e8

/** Gas the person spends on the paying chain before a bridge takes over (EVM chains, direction `in`). */
export function depositGas(provider: ProviderId, stable: StableAsset): bigint | undefined {
  if (!stable.gas) return undefined
  // NEAR Intents: one transfer to the deposit address. THORChain: approve the router, then depositWithExpiry.
  return provider === 'near' ? stable.gas.transfer : stable.gas.approve + THORCHAIN_DEPOSIT_GAS
}

function satUsd(prices: UsdPrices): number | undefined {
  return prices.BCH === undefined ? undefined : prices.BCH / SATS_PER_BCH
}

/** One base unit of a token at Cauldron's price (sats per unit), in USD. */
function tokenUnitUsd(satsPerUnit: string | undefined, prices: UsdPrices): number | undefined {
  const sat = satUsd(prices)
  return sat === undefined || !satsPerUnit ? undefined : Number(satsPerUnit) * sat
}

/** One base unit of the Bitcoin Cash side asset of a bridged route (1 sat, or 0.01 PUSD/MUSD), in USD. */
export function bchSideUnitUsd(route: Route, prices: UsdPrices): number | undefined {
  if (isLocal(route.pair)) return undefined
  if (route.pair.bchAsset === 'BCH') return satUsd(prices)
  return tokenUnitUsd(route.cauldron?.marketPrice, prices)
}

/** One base unit of the stablecoin on the other chain, in USD. */
export function stableUnitUsd(stable: StableAsset, prices: UsdPrices): number | undefined {
  const price = prices[stable.symbol]
  return price === undefined ? undefined : price / 10 ** stable.decimals
}

/**
 * A Cauldron-only route: BCH is priced live; a token at the route's own pre-trade price (the paid token's on a
 * token-for-token trade, `receiveMarketPrice` for the received one).
 */
function localUnitUsd(route: Route, prices: UsdPrices, side: 'pay' | 'receive'): number | undefined {
  if (!isLocal(route.pair)) return undefined
  const asset = side === 'pay' ? route.pair.from : route.pair.to
  if (asset === 'BCH') return satUsd(prices)
  const both = route.pair.from !== 'BCH' && route.pair.to !== 'BCH'
  const price = both && side === 'receive' ? route.cauldron?.receiveMarketPrice : route.cauldron?.marketPrice
  return tokenUnitUsd(price, prices)
}

export function payUnitUsd(route: Route, prices: UsdPrices): number | undefined {
  if (isLocal(route.pair)) return localUnitUsd(route, prices, 'pay')
  return route.pair.direction === 'in'
    ? stableUnitUsd(route.pair.stable, prices)
    : bchSideUnitUsd(route, prices)
}

export function receiveUnitUsd(route: Route, prices: UsdPrices): number | undefined {
  if (isLocal(route.pair)) return localUnitUsd(route, prices, 'receive')
  return route.pair.direction === 'in'
    ? bchSideUnitUsd(route, prices)
    : stableUnitUsd(route.pair.stable, prices)
}

export type FeeLineId = 'bridge' | 'cauldron' | 'network'

export interface FeeLine {
  id: FeeLineId
  usd: number
}

export interface RouteCosts {
  valueInUsd: number
  valueOutUsd: number
  lines: FeeLine[]
  /** Everything the person gives up: the sum of the lines. */
  totalUsd: number
}

/**
 * The fee lines of one route:
 * - bridge: value in minus the value of what crosses (the provider's fee and spread together);
 * - Cauldron: the Router's 0.1%, the miner fee, and the trade's price impact against the pre-trade price
 *   (the 1,000 sats a token output carries and any change stay with the person, so they are not a cost);
 * - network: gas on the paying chain (`depositFeeUsd`, read live) or the Bitcoin Cash send to the bridge.
 */
export function routeCosts(route: Route, prices: UsdPrices, depositFeeUsd?: number): RouteCosts | undefined {
  const sat = satUsd(prices)
  const payUnit = payUnitUsd(route, prices)
  const receiveUnit = receiveUnitUsd(route, prices)
  if (sat === undefined || payUnit === undefined || receiveUnit === undefined) return undefined

  const valueInUsd = Number(route.amountIn) * payUnit
  const valueOutUsd = Number(route.amountOut) * receiveUnit
  const bridgedUsd = Number(route.bridgeSats) * sat
  const leg = route.cauldron
  const lines: FeeLine[] = []

  if (isLocal(route.pair)) {
    // Cauldron alone: its 0.1% (in sats, or in the sold token on a token-for-token trade), the miner fee, and the
    // price impact against the pre-trade price. A bought token output's 1,000 sats stay with the person.
    if (leg) {
      const { from, to } = route.pair
      let impactUsd = 0
      if (from === 'BCH') {
        impactUsd = (Number(leg.tradeSats) - Number(route.amountOut) * Number(leg.marketPrice ?? 0)) * sat
      } else if (to === 'BCH') {
        impactUsd = (Number(route.amountIn) * Number(leg.marketPrice ?? 0) - Number(leg.tradeSats)) * sat
      } else {
        impactUsd = valueInUsd - valueOutUsd
      }
      const feeTokensUsd = Number(leg.feeTokens ?? 0n) * payUnit
      const feesUsd = Number(leg.routerFeeSats + leg.minerFeeSats) * sat + feeTokensUsd
      lines.push({ id: 'cauldron', usd: feesUsd + Math.max(0, impactUsd) })
    }
  } else if (route.pair.direction === 'in') {
    lines.push({ id: 'bridge', usd: valueInUsd - bridgedUsd })
    if (leg) {
      const impactSats = Number(leg.tradeSats) - Number(route.amountOut) * Number(leg.marketPrice ?? 0)
      const cauldronSats = Number(leg.routerFeeSats + leg.minerFeeSats) + Math.max(0, impactSats)
      lines.push({ id: 'cauldron', usd: cauldronSats * sat })
    }
    if (depositFeeUsd !== undefined) lines.push({ id: 'network', usd: depositFeeUsd })
  } else {
    if (leg) {
      const impactSats = Number(route.amountIn) * Number(leg.marketPrice ?? 0) - Number(leg.tradeSats)
      const cauldronSats = Number(leg.routerFeeSats + leg.minerFeeSats) + Math.max(0, impactSats)
      lines.push({ id: 'cauldron', usd: cauldronSats * sat })
    }
    lines.push({ id: 'network', usd: Number(BCH_SEND_FEE_SATS) * sat })
    lines.push({ id: 'bridge', usd: bridgedUsd - valueOutUsd })
  }

  const totalUsd = lines.reduce((sum, line) => sum + line.usd, 0)
  return { valueInUsd, valueOutUsd, lines, totalUsd }
}

/**
 * A fee paid outside the quote (gas on the paying chain), restated in the receiving asset's base units, so routes
 * can be ranked by what the person really keeps.
 */
export function costInReceiveUnits(route: Route, prices: UsdPrices, feeUsd: number): bigint | undefined {
  const unit = receiveUnitUsd(route, prices)
  if (!unit || !Number.isFinite(feeUsd) || feeUsd <= 0) return undefined
  return BigInt(Math.round(feeUsd / unit))
}
