import { describe, expect, it } from 'vitest'
import { prepareArrival } from '@/lib/engine/arrival-terms'
import { arrivalTermsSchema, checkArrivalTerms } from './policy'

const NOW = Date.UTC(2026, 10, 18, 18, 0, 0)
const OWNER = 'bitcoincash:zqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqweyg7usz'
const terms = () =>
  prepareArrival({
    bchAsset: 'PUSD',
    ownerAddress: OWNER,
    minTokens: 290n,
    minBridgeSats: 1_400_000n,
    now: NOW,
  }).terms

describe('what the server keeps for its keeper', () => {
  it('keeps a new swap contract’s public terms', () => {
    expect(arrivalTermsSchema.safeParse(terms()).success).toBe(true)
    expect(checkArrivalTerms(terms(), NOW)).toBeUndefined()
  })

  it('refuses a token Hashi does not swap into, a strange owner, a bad key or a far refund time', () => {
    expect(checkArrivalTerms({ ...terms(), tokenCategory: 'ab'.repeat(32) }, NOW)).toMatch(/token/)
    expect(checkArrivalTerms({ ...terms(), owner: '6a' }, NOW)).toMatch(/address/)
    expect(checkArrivalTerms({ ...terms(), tradePublicKey: `02${'ff'.repeat(32)}` }, NOW)).toMatch(/key/)
    expect(checkArrivalTerms(terms(), NOW + 2 * 60 * 60_000)).toMatch(/Refund time/)
    expect(checkArrivalTerms({ ...terms(), refundAfter: NOW / 1000 + 10 * 60 * 60 }, NOW)).toMatch(
      /Refund time/,
    )
  })

  it('takes only the public half of anything: no field for a private key', () => {
    expect(arrivalTermsSchema.safeParse({ ...terms(), tradeKey: 'aa' }).data).not.toHaveProperty('tradeKey')
  })
})
