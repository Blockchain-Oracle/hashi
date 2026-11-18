import { describe, expect, it } from 'vitest'
import { advance, type SwapRecord } from '@/lib/engine/swap'
import { headline, trackerSteps } from './steps'

const base: SwapRecord = {
  id: 'test',
  createdAt: 0,
  updatedAt: 0,
  provider: 'near',
  direction: 'in',
  stable: { chain: 'base', symbol: 'USDC' },
  bchAsset: 'PUSD',
  amountIn: '3000000',
  approvals: 0,
  addresses: { stableSide: '0x1', bchPlain: 'bitcoincash:q', bchToken: 'bitcoincash:z' },
  depositAddress: '0xdeposit',
  status: 'quoted',
  events: [],
}

const states = (record: SwapRecord) => trackerSteps(record, 0).map((s) => [s.id, s.state])

describe('tracker steps', () => {
  it('asks for the deposit first', () => {
    expect(states(base)).toEqual([
      ['deposit', 'active'],
      ['bridge', 'pending'],
      ['arrive', 'pending'],
      ['cauldron', 'pending'],
    ])
    expect(headline(base).close).toBe('Nothing has been sent yet.')
  })

  it('waits on the Cauldron approval once BCH has arrived', () => {
    const sent = advance({ ...base, depositTx: '0xabc' }, 'deposit-sent', 'sent')
    const arrived = advance({ ...sent, bchTxid: 'f00d' }, 'bch-arrived', 'BCH delivered')
    expect(states(arrived)).toEqual([
      ['deposit', 'done'],
      ['bridge', 'done'],
      ['arrive', 'done'],
      ['cauldron', 'active'],
    ])
    expect(headline(arrived).title).toBe('One approval left')
  })

  it('ends an unstarted swap whose quote ran out as expired', () => {
    const expired = advance(base, 'expired', 'The quote ran out before anything was sent')
    const steps = trackerSteps(expired, 0)
    expect(steps[0]?.state).toBe('failed')
    expect(steps.at(-1)).toMatchObject({ id: 'end', title: 'The quote expired', state: 'failed' })
    expect(headline(expired).title).toBe('Quote expired')
  })

  it('after selling PUSD, asks only for sending the BCH on', () => {
    const sold = advance(
      {
        ...base,
        direction: 'out',
        stable: { chain: 'ethereum', symbol: 'USDC' },
        cauldronTxid: 'ab'.repeat(32),
      },
      'quoted',
      'Sold PUSD on Cauldron',
    )
    expect(states(sold).slice(0, 2)).toEqual([
      ['sell', 'done'],
      ['deposit', 'active'],
    ])
    expect(headline(sold).title).toBe('Send the BCH to NEAR Intents')
  })

  it('sells PUSD and pays NEAR in one step when the sale is the deposit', () => {
    const quoted: SwapRecord = {
      ...base,
      direction: 'out',
      bridgeQuote: { quoteRequest: { swapType: 'FLEX_INPUT' } },
    }
    expect(states(quoted).slice(0, 2)).toEqual([
      ['deposit', 'active'],
      ['bridge', 'pending'],
    ])
    expect(trackerSteps(quoted, 0)[0]?.title).toMatch(/^Sell .* on Cauldron, paying NEAR Intents$/)
    const sent = advance(
      { ...quoted, bchTxid: 'beef' },
      'deposit-sent',
      'Sale and deposit in one transaction',
    )
    expect(states(sent).slice(0, 2)).toEqual([
      ['deposit', 'done'],
      ['bridge', 'active'],
    ])
  })

  it('marks where a refunded swap stopped and says why', () => {
    const sent = advance({ ...base, depositTx: '0xabc' }, 'deposit-sent', 'sent')
    const refunded = advance(sent, 'refunded', 'Deadline passed')
    const steps = trackerSteps(refunded, 0)
    expect(steps.find((s) => s.id === 'bridge')?.state).toBe('failed')
    expect(steps.at(-1)).toMatchObject({ id: 'end', state: 'failed', detail: 'Deadline passed' })
  })

  it('walks a reverse swap of plain BCH without a Cauldron step', () => {
    const reverse: SwapRecord = { ...base, direction: 'out', bchAsset: 'BCH', amountIn: '100000' }
    const sent = advance({ ...reverse, bchTxid: 'beef' }, 'deposit-sent', 'BCH deposit sent')
    expect(states(sent)).toEqual([
      ['deposit', 'done'],
      ['bridge', 'active'],
      ['arrive', 'pending'],
    ])
    expect(headline(sent).close).toContain('Safe to close')
  })
})

describe('a swap that stays on Bitcoin Cash', () => {
  const local: SwapRecord = {
    id: 'local',
    createdAt: 0,
    updatedAt: 0,
    provider: 'cauldron',
    direction: 'local',
    bchFrom: 'PUSD',
    bchAsset: 'MUSD',
    amountIn: '1000',
    approvals: 0,
    addresses: { bchPlain: 'bitcoincash:q', bchToken: 'bitcoincash:z' },
    status: 'quoted',
    events: [],
  }

  it('is one Cauldron trade, then the asset arrives', () => {
    expect(states(local)).toEqual([
      ['swap', 'active'],
      ['arrive', 'pending'],
    ])
    expect(trackerSteps(local, 0)[0]?.title).toBe('Swap 10 PUSD for MUSD on Cauldron')
    expect(headline(local).title).toBe('Approve the swap')
  })

  it('shows what arrived once the trade is out', () => {
    const done = advance(local, 'completed', 'Swapped', {
      cauldronTxid: 'ab'.repeat(32),
      receivedAmount: '974',
    })
    expect(states(done)).toEqual([
      ['swap', 'done'],
      ['arrive', 'done'],
    ])
    expect(trackerSteps(done, 0)[1]?.detail).toBe('9.74 MUSD')
    expect(headline(done).title).toBe('Swap complete')
  })
})
