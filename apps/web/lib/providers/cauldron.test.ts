import { describe, expect, it } from 'vitest'
import { offeredBelowFloor, RouterError } from './cauldron'

describe('offeredBelowFloor', () => {
  it("reads what the trade would give from the Router's min_output refusal", () => {
    const error = new RouterError('slippage', 'user receives 198441, below min_output 999999999')
    expect(offeredBelowFloor(error)).toBe(198441n)
  })

  it('ignores every other error', () => {
    expect(
      offeredBelowFloor(new RouterError('insufficient_funds', 'inputs cannot cover outputs')),
    ).toBeUndefined()
    expect(offeredBelowFloor(new Error('user receives 5'))).toBeUndefined()
  })
})
