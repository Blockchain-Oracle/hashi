import { describe, expect, it } from 'vitest'
import { minimumToShow } from './format'

describe('minimumToShow', () => {
  it('keeps a minimum that is already a round amount', () => {
    // NEAR Intents: "try at least 150000" is 0.15 USDC.
    expect(minimumToShow(150_000n, 6, 'USDC')).toBe(150_000n)
  })

  it('rounds up at the shown precision, never down', () => {
    // 0.812345 USDC shows as 0.8124, which is still enough for the bridge.
    expect(minimumToShow(812_345n, 6, 'USDC')).toBe(812_400n)
    // PUSD and MUSD show whole cents.
    expect(minimumToShow(1_001n, 2, 'PUSD')).toBe(1_001n)
    expect(minimumToShow(123_400_000_000_000_001n, 18, 'USDT')).toBe(123_500_000_000_000_000n)
  })

  it('leaves sats alone', () => {
    expect(minimumToShow(12_345n, 8, 'BCH')).toBe(12_345n)
  })
})
