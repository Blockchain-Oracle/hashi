import { describe, expect, it } from 'vitest'
import { arrivalContract, arrivalFloor } from '@/lib/bch/arrival/contract'
import { BCH_ASSETS } from '@/lib/constants/assets'
import { ARRIVAL_REFUND_DELAY_MS } from '@/lib/constants/limits'
import { prepareArrival, tradesOnArrival } from './arrival-terms'
import type { SwapRecord } from './swap'

const OWNER = 'bitcoincash:zqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqweyg7usz'
const NOW = Date.UTC(2026, 10, 18, 18, 0, 0)

describe('a new swap contract', () => {
  const arrival = prepareArrival({
    bchAsset: 'PUSD',
    ownerAddress: OWNER,
    minTokens: 4_880n,
    minBridgeSats: 1_000_000n,
    now: NOW,
  })

  it('promises the review’s "at least", and pro rata only if less BCH than the bridge promised arrives', () => {
    expect(arrivalFloor(arrival.terms, 1_000_000n)).toBe(4_880n)
    expect(arrivalFloor(arrival.terms, 1_010_000n)).toBe(4_880n)
    expect(arrivalFloor(arrival.terms, 500_000n)).toBe(2_440n)
  })

  it('names the person, the token and a refund time an hour on, at its own P2SH20 address', () => {
    expect(arrival.terms.owner).toBe(`76a914${'00'.repeat(20)}88ac`)
    expect(arrival.terms.tokenCategory).toBe(BCH_ASSETS.PUSD.category)
    expect(arrival.terms.refundAfter).toBe((NOW + ARRIVAL_REFUND_DELAY_MS) / 1000)
    expect(arrival.address).toBe(arrivalContract(arrival.terms).address)
    expect(arrival.address).toMatch(/^bitcoincash:p/)
  })

  it('gets a fresh trade key, so no two swaps share an address', () => {
    const again = prepareArrival({
      bchAsset: 'PUSD',
      ownerAddress: OWNER,
      minTokens: 4_880n,
      minBridgeSats: 1_000_000n,
      now: NOW,
    })
    expect(again.tradeKey).not.toBe(arrival.tradeKey)
    expect(again.address).not.toBe(arrival.address)
  })

  it('is not made for plain BCH, or without a floor', () => {
    expect(() =>
      prepareArrival({ bchAsset: 'BCH', ownerAddress: OWNER, minTokens: 1n, minBridgeSats: 1n, now: NOW }),
    ).toThrow()
    expect(() =>
      prepareArrival({ bchAsset: 'PUSD', ownerAddress: OWNER, minTokens: 0n, minBridgeSats: 1n, now: NOW }),
    ).toThrow()
  })

  it('trades by itself until the BCH has gone back to the wallet', () => {
    const record = { arrival } as SwapRecord
    expect(tradesOnArrival(record)).toBe(true)
    expect(tradesOnArrival({ arrival: { ...arrival, returnTxid: 'ab' } } as SwapRecord)).toBe(false)
    expect(tradesOnArrival({} as SwapRecord)).toBe(false)
  })
})
