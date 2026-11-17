import { describe, expect, it } from 'vitest'
import { CAULDRON_QUOTE_TTL_MS } from '@/lib/constants/limits'
import { quoteDeadline } from './expiry'
import type { SwapRecord } from './swap'

const base: SwapRecord = {
  id: 'x',
  createdAt: 1_000_000,
  updatedAt: 1_000_000,
  provider: 'near',
  direction: 'in',
  stable: { chain: 'base', symbol: 'USDC' },
  bchAsset: 'PUSD',
  amountIn: '10000000',
  approvals: 0,
  addresses: { stableSide: '0x1', bchPlain: 'bitcoincash:q', bchToken: 'bitcoincash:z' },
  status: 'quoted',
  events: [],
}

describe('quoteDeadline', () => {
  it("uses NEAR's deposit deadline", () => {
    const record = { ...base, bridgeQuote: { quote: { deadline: '2026-11-17T12:00:00.000Z' } } }
    expect(quoteDeadline(record)).toBe(Date.parse('2026-11-17T12:00:00.000Z'))
  })

  it("uses THORChain's quote expiry (seconds)", () => {
    const record = { ...base, provider: 'thorchain' as const, bridgeQuote: { expiry: 1_800_000_000 } }
    expect(quoteDeadline(record)).toBe(1_800_000_000_000)
  })

  it('gives a swap that starts on Cauldron an hour', () => {
    const record = {
      ...base,
      provider: 'cauldron' as const,
      direction: 'local' as const,
      bchFrom: 'BCH' as const,
    }
    expect(quoteDeadline(record)).toBe(base.createdAt + CAULDRON_QUOTE_TTL_MS)
  })

  it('never expires once something moved', () => {
    expect(quoteDeadline({ ...base, status: 'deposit-sent' })).toBeUndefined()
    // PUSD sold, its BCH not yet sent on: the person holds BCH, so the swap waits for them.
    expect(quoteDeadline({ ...base, direction: 'out', cauldronTxid: 'ab'.repeat(32) })).toBeUndefined()
  })
})
