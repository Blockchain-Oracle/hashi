import { describe, expect, it } from 'vitest'
import {
  bchForTokenSwap,
  minerFeeSats,
  proceedsFromSell,
  routerFeeSats,
  routerFeeTokens,
  sellableForTokenSwap,
  spendableForBuy,
  TOKEN_OUTPUT_SATS,
} from './cauldron-fees'

describe('Cauldron build costs', () => {
  it('matches the Router fee of real builds', () => {
    // B1: buy 10 PUSD, input 4,860,352 sats → fee_sats 4,860. B7: sell 10 PUSD, output 4,832,459 → 4,832.
    expect(routerFeeSats(4_860_352n)).toBe(4_860n)
    expect(routerFeeSats(4_832_459n)).toBe(4_832n)
  })

  it('stays within a few percent of the measured miner fees', () => {
    const measured: [number, number][] = [
      [1, 452],
      [22, 4_394],
      [37, 7_394],
      [48, 9_495],
    ]
    for (const [pools, sats] of measured) {
      const estimate = Number(minerFeeSats(pools))
      expect(Math.abs(estimate - sats) / sats).toBeLessThan(0.15)
    }
  })

  it('never lets a buy spend more than it has', () => {
    for (const available of [10_000n, 485_000n, 4_866_712n, 100_000_000n]) {
      for (const pools of [1, 2, 10]) {
        const trade = spendableForBuy(available, pools)
        const total = trade + routerFeeSats(trade) + minerFeeSats(pools) + TOKEN_OUTPUT_SATS
        expect(total).toBeLessThanOrEqual(available)
        expect(available - total).toBeLessThan(10n)
      }
    }
  })

  it('returns zero when the fees alone exceed the amount', () => {
    expect(spendableForBuy(1_000n, 1)).toBe(0n)
    expect(proceedsFromSell(300n, 1)).toBe(0n)
  })

  it('takes both fees from a sale', () => {
    expect(proceedsFromSell(4_832_459n, 48)).toBe(4_832_459n - 4_832n - minerFeeSats(48))
  })
})

describe('token-for-token trades (PUSD ⇄ MUSD)', () => {
  it('charges 0.1% of the sold token on top, rounded up (live build: 10 PUSD sold cost 10.01)', () => {
    expect(routerFeeTokens(1000n)).toBe(1n)
    expect(routerFeeTokens(1001n)).toBe(2n)
    expect(routerFeeTokens(10n)).toBe(1n)
  })

  it('leaves room for that fee when selling a whole balance', () => {
    for (const balance of [1n, 10n, 999n, 1000n, 1001n, 10_361n, 123_456n]) {
      const amount = sellableForTokenSwap(balance)
      expect(amount + routerFeeTokens(amount)).toBeLessThanOrEqual(balance)
      // ...and wastes at most one unit.
      expect(amount + 1n + routerFeeTokens(amount + 1n)).toBeGreaterThan(balance)
    }
  })

  it('asks for enough plain BCH to cover the measured miner fee (10,901 sats over 54 pools)', () => {
    expect(bchForTokenSwap(54)).toBeGreaterThan(10_901n + 2n * TOKEN_OUTPUT_SATS)
  })
})
