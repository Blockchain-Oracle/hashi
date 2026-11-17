import { describe, expect, it } from 'vitest'
import { STABLES } from '@/lib/constants/assets'
import { BCH_SEND_FEE_SATS, THORCHAIN_DEPOSIT_GAS } from '@/lib/constants/fees'
import { costInReceiveUnits, depositGas, routeCosts } from './costs'
import type { BridgePair, Pair, Route } from './types'

const usdcBase = STABLES.find((s) => s.symbol === 'USDC' && s.chain === 'base') as BridgePair['stable']
const usdcSolana = STABLES.find((s) => s.symbol === 'USDC' && s.chain === 'solana') as BridgePair['stable']
// Round numbers: BCH at $200 makes 1 sat = $0.000002, and 5,000 sats per 0.01 PUSD makes PUSD exactly $1.
const prices = { USDC: 1, BCH: 200 }

function route(pair: Pair, over: Partial<Route>): Route {
  return {
    provider: 'near',
    pair,
    amountIn: 0n,
    amountOut: 0n,
    minAmountOut: 0n,
    bridgeSats: 0n,
    etaSeconds: 0,
    signatures: 2,
    quotedAt: 0,
    raw: { bridge: null },
    ...over,
  }
}

describe('route costs', () => {
  it('splits USDC → PUSD into bridge, Cauldron and gas', () => {
    const r = route(
      { direction: 'in', stable: usdcBase, bchAsset: 'PUSD' },
      {
        amountIn: 10_000_000n, // 10 USDC
        bridgeSats: 4_950_000n, // $9.90 crossed
        amountOut: 980n, // 9.80 PUSD at the pre-trade price = 4,900,000 sats
        cauldron: {
          pools: 1,
          tradeSats: 4_910_000n,
          routerFeeSats: 4_910n,
          minerFeeSats: 452n,
          marketPrice: '5000',
          partial: false,
        },
      },
    )
    const costs = routeCosts(r, prices, 0.01)
    expect(costs?.valueInUsd).toBeCloseTo(10)
    expect(costs?.valueOutUsd).toBeCloseTo(9.8)
    const line = (id: string) => costs?.lines.find((l) => l.id === id)?.usd
    expect(line('bridge')).toBeCloseTo(0.1)
    // 4,910 + 452 sats of fees plus 10,000 sats of price impact.
    expect(line('cauldron')).toBeCloseTo(15_362 * 0.000002)
    expect(line('network')).toBeCloseTo(0.01)
  })

  it('charges the Bitcoin Cash send when paying out with BCH', () => {
    const r = route(
      { direction: 'out', stable: usdcBase, bchAsset: 'BCH' },
      { amountIn: 5_000_000n, bridgeSats: 5_000_000n, amountOut: 9_900_000n },
    )
    const costs = routeCosts(r, prices)
    const line = (id: string) => costs?.lines.find((l) => l.id === id)?.usd
    expect(line('network')).toBeCloseTo(Number(BCH_SEND_FEE_SATS) * 0.000002)
    expect(line('bridge')).toBeCloseTo(0.1)
  })

  it('cannot price a route without the coin prices', () => {
    const r = route({ direction: 'in', stable: usdcBase, bchAsset: 'BCH' }, { amountIn: 1n, amountOut: 1n })
    expect(routeCosts(r, {})).toBeUndefined()
  })

  it('restates gas in the receiving asset', () => {
    const r = route(
      { direction: 'in', stable: usdcBase, bchAsset: 'BCH' },
      { amountIn: 1_000_000n, amountOut: 495_000n },
    )
    // $0.50 of gas at $200/BCH is 250,000 sats.
    expect(costInReceiveUnits(r, prices, 0.5)).toBe(250_000n)
  })
})

describe('deposit gas', () => {
  it('is one transfer for NEAR Intents and an approval plus a deposit for THORChain', () => {
    expect(depositGas('near', usdcBase)).toBe(usdcBase.gas?.transfer)
    expect(depositGas('thorchain', usdcBase)).toBe((usdcBase.gas?.approve ?? 0n) + THORCHAIN_DEPOSIT_GAS)
  })

  it('has no gas figure on Solana', () => {
    expect(depositGas('near', usdcSolana)).toBeUndefined()
  })
})

describe('Cauldron-only route costs', () => {
  const cauldronRoute = (pair: Pair, over: Partial<Route>) =>
    route(pair, { provider: 'cauldron', signatures: 1, ...over })

  it('prices BCH → PUSD with one Cauldron line: fees plus price impact', () => {
    const r = cauldronRoute(
      { direction: 'local', from: 'BCH', to: 'PUSD' },
      {
        amountIn: 5_000_000n, // $10 of BCH leaves the wallet
        amountOut: 990n, // 9.90 PUSD at 5,000 sats per 0.01 = 4,950,000 sats of value
        cauldron: {
          pools: 1,
          tradeSats: 4_960_000n,
          routerFeeSats: 4_960n,
          minerFeeSats: 452n,
          marketPrice: '5000',
          partial: false,
        },
      },
    )
    const costs = routeCosts(r, prices)
    expect(costs?.lines.map((l) => l.id)).toEqual(['cauldron'])
    // (4,960 + 452) sats of fees + (4,960,000 − 4,950,000) sats of impact = 15,412 sats = $0.030824.
    expect(costs?.totalUsd).toBeCloseTo(0.030824, 6)
    expect(costs?.valueInUsd).toBeCloseTo(10, 6)
    expect(costs?.valueOutUsd).toBeCloseTo(9.9, 6)
  })

  it('prices PUSD → MUSD with each token at its own pre-trade price, the token fee on top', () => {
    const r = cauldronRoute(
      { direction: 'local', from: 'PUSD', to: 'MUSD' },
      {
        amountIn: 1000n, // 10 PUSD at 5,000 sats = $10
        amountOut: 974n, // 9.74 MUSD at 5,050 sats = $9.8374
        cauldron: {
          pools: 54,
          tradeSats: 0n,
          routerFeeSats: 0n,
          feeTokens: 1n, // 0.01 PUSD = $0.01
          minerFeeSats: 10_628n, // $0.021256
          marketPrice: '5000',
          receiveMarketPrice: '5050',
          partial: false,
        },
      },
    )
    const costs = routeCosts(r, prices)
    expect(costs?.valueOutUsd).toBeCloseTo(9.8374, 6)
    // $0.01 fee + $0.021256 miner + ($10 − $9.8374) impact.
    expect(costs?.totalUsd).toBeCloseTo(0.01 + 0.021256 + 0.1626, 6)
  })
})
