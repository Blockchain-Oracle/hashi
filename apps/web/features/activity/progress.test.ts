import { describe, expect, it } from 'vitest'
import { advance, type SwapRecord } from '@/lib/engine/swap'
import { clock, liveProgress, shortProgress } from './progress'

/** The timings of the 0.48 PUSD → USDC (Base) sale through NEAR on 2026-11-18. */
const SENT = Date.UTC(2026, 10, 18, 18, 6, 12)
const BLOCK_1 = Date.UTC(2026, 10, 18, 18, 6, 34)
const BLOCK_2 = Date.UTC(2026, 10, 18, 18, 23, 59)
const PROCESSING = Date.UTC(2026, 10, 18, 18, 33, 39)
const DEADLINE = '2026-11-18T22:04:27.458Z'

const quoted: SwapRecord = {
  id: 'sale',
  createdAt: SENT - 120_000,
  updatedAt: SENT,
  provider: 'near',
  direction: 'out',
  stable: { chain: 'base', symbol: 'USDC' },
  bchAsset: 'PUSD',
  amountIn: '48',
  approvals: 1,
  addresses: { stableSide: '0x1', bchPlain: 'bitcoincash:q', bchToken: 'bitcoincash:z' },
  depositAddress: 'bitcoincash:qdeposit',
  bridgeQuote: { quote: { timeEstimate: 109 }, quoteRequest: { deadline: DEADLINE } },
  status: 'quoted',
  events: [],
}
const sent: SwapRecord = {
  ...advance({ ...quoted, bchTxid: 'ca03' }, 'deposit-sent', 'BCH deposit sent'),
  events: [{ at: SENT, status: 'deposit-sent', note: 'BCH deposit sent' }],
}
const pending = { at: SENT, near: { status: 'PENDING_DEPOSIT', updatedAt: SENT - 120_000 } }

describe('live progress coming out through NEAR', () => {
  it('counts blocks while the deposit waits for its first one, and names the refund time', () => {
    const progress = liveProgress(sent, pending, { tip: 977_917, tipAt: SENT - 60_000, depositHeight: 0 })
    expect(progress).toMatchObject({
      who: 'bch',
      title: 'Waiting for the first Bitcoin Cash block',
      blocks: { have: 0, need: 2 },
      refundAt: Date.parse(DEADLINE),
    })
    expect(progress?.countdown).toBeUndefined()
  })

  it('after the first block, waits for the second and says how long since the last', () => {
    const progress = liveProgress(sent, pending, { tip: 977_918, tipAt: BLOCK_1, depositHeight: 977_918 })
    expect(progress).toMatchObject({
      title: 'Waiting for block 2 of 2',
      blocks: { have: 1, need: 2, lastAt: BLOCK_1 },
    })
    if (!progress) throw new Error('no progress')
    expect(shortProgress(progress, BLOCK_1 + 17 * 60_000)).toBe('waiting for block 2 of 2')
  })

  it('with both blocks in, waits on NEAR and counts the time since the second', () => {
    const progress = liveProgress(sent, pending, { tip: 977_919, tipAt: BLOCK_2, depositHeight: 977_918 })
    expect(progress).toMatchObject({
      who: 'near',
      title: 'NEAR Intents is taking the deposit',
      since: BLOCK_2,
    })
    if (!progress) throw new Error('no progress')
    expect(shortProgress(progress, BLOCK_2 + 9 * 60_000 + 40_000)).toBe('9:40 waiting')
  })

  it('blocks past the ones NEAR needs: counts NEAR’s wait from the block it waited for', () => {
    const progress = liveProgress(sent, pending, {
      tip: 977_921,
      tipAt: BLOCK_2 + 30 * 60_000,
      depositHeight: 977_918,
      confirmedAt: BLOCK_2,
    })
    expect(progress).toMatchObject({ title: 'NEAR Intents is taking the deposit', since: BLOCK_2 })
  })

  it('once NEAR swaps, counts down its own estimate, then counts up past it', () => {
    const bridging = advance(sent, 'bridging', 'NEAR Intents is swapping')
    const progress = liveProgress(
      bridging,
      { at: PROCESSING, near: { status: 'PROCESSING', updatedAt: PROCESSING } },
      { tip: 977_919, tipAt: BLOCK_2, depositHeight: 977_918 },
    )
    expect(progress).toMatchObject({
      title: 'NEAR Intents is swapping into USDC',
      blocks: { have: 2, need: 2 },
      countdown: { from: PROCESSING, to: PROCESSING + 109_000 },
    })
    if (!progress) throw new Error('no progress')
    expect(shortProgress(progress, PROCESSING + 30_000)).toBe('1:19 left')
    expect(shortProgress(progress, PROCESSING + 120_000)).toBe('0:11 over')
  })
})

describe('live progress elsewhere', () => {
  it('going in through NEAR, waits for NEAR to see the deposit on the paying chain', () => {
    const into: SwapRecord = { ...sent, direction: 'in', bchAsset: 'BCH' }
    expect(liveProgress(into, pending, null)).toMatchObject({
      who: 'near',
      title: 'NEAR Intents is seeing your deposit on Base',
      since: SENT,
    })
  })

  it('through THORChain, counts down its confirmation timer', () => {
    const thor: SwapRecord = { ...sent, provider: 'thorchain', bridgeQuote: undefined }
    const at = SENT + 60_000
    const progress = liveProgress(
      thor,
      {
        at,
        thor: { observed: true, confirmed: false, confirmSecondsLeft: 300, swapped: false, sent: false },
      },
      null,
    )
    expect(progress).toMatchObject({
      who: 'bch',
      title: 'THORChain is waiting for Bitcoin Cash blocks',
      countdown: { to: at + 300_000 },
    })
    expect(progress?.refundAt).toBeUndefined()
  })

  it('says nothing once the bridge is done, or before the deposit', () => {
    expect(liveProgress(quoted, pending, null)).toBeUndefined()
    expect(liveProgress(advance(sent, 'completed', 'Stablecoin delivered'), pending, null)).toBeUndefined()
  })

  it('reads clocks as minutes and seconds, with hours past an hour', () => {
    expect(clock(0)).toBe('0:00')
    expect(clock(65_000)).toBe('1:05')
    expect(clock(3_725_000)).toBe('1:02:05')
  })
})
