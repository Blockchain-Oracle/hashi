import { describe, expect, it } from 'vitest'
import { parseNearStatus } from './near'
import { NEAR_STATUS_PENDING } from './near-status.fixture'

/** NEAR's real answer, with some fields changed: what a later stage of the same swap looks like. */
function body(changes: { status?: string; swapDetails?: Record<string, unknown>; quoteResponse?: unknown }) {
  return {
    ...NEAR_STATUS_PENDING,
    ...(changes.status ? { status: changes.status } : {}),
    ...('quoteResponse' in changes ? { quoteResponse: changes.quoteResponse } : {}),
    swapDetails: { ...NEAR_STATUS_PENDING.swapDetails, ...changes.swapDetails },
  }
}

describe('NEAR status', () => {
  it('reads the live answer, nulls and all', () => {
    const status = parseNearStatus(NEAR_STATUS_PENDING)
    expect(status.status).toBe('PENDING_DEPOSIT')
    expect(status.swapDetails.amountIn).toBeUndefined()
    expect(status.swapDetails.amountOut).toBeUndefined()
    expect(status.swapDetails.refundReason).toBeUndefined()
    expect(status.swapDetails.slippage).toBeUndefined()
    expect(status.swapDetails.withdrawFee).toBe('500')
    expect(status.quoteResponse?.quote?.minAmountIn).toBe(NEAR_STATUS_PENDING.quoteResponse.quote.minAmountIn)
  })

  it('reads a finished swap', () => {
    const status = parseNearStatus(
      body({
        status: 'SUCCESS',
        swapDetails: {
          amountOut: '128000',
          destinationChainTxHashes: [{ hash: 'ab12', explorerUrl: 'https://example.org/tx/ab12' }],
        },
      }),
    )
    expect(status.status).toBe('SUCCESS')
    expect(status.swapDetails.amountOut).toBe('128000')
    expect(status.swapDetails.destinationChainTxHashes[0]?.hash).toBe('ab12')
  })

  it('reads lists sent as null as empty', () => {
    const status = parseNearStatus(
      body({ swapDetails: { destinationChainTxHashes: null, nearTxHashes: null } }),
    )
    expect(status.swapDetails.destinationChainTxHashes).toEqual([])
    expect(status.swapDetails.nearTxHashes).toEqual([])
  })

  it('keeps going on a status NEAR adds later, and keeps its name', () => {
    const status = parseNearStatus(body({ status: 'SOMETHING_NEW' }))
    expect(status.status).toBe('UNKNOWN')
    expect(status.statusText).toBe('SOMETHING_NEW')
  })

  it('treats an echoed quote it cannot read as absent, not as a failed check', () => {
    expect(parseNearStatus(body({ quoteResponse: null })).quoteResponse).toBeUndefined()
    expect(parseNearStatus(body({ quoteResponse: { quote: 42 } })).quoteResponse).toBeUndefined()
  })
})
