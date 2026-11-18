import { describe, expect, it } from 'vitest'
import { STABLES } from '@/lib/constants/assets'
import { parseNearStatus } from '@/lib/providers/near'
import { NEAR_STATUS_PENDING } from '@/lib/providers/near-status.fixture'
import { checkNearDeposit, checkStatic, createLimiter, type RelayRequest } from './policy'

const NOW = 1_800_000_000
const BASE_USDC = STABLES.find((s) => s.chain === 'base' && s.symbol === 'USDC')?.nearAssetId ?? ''

const request: RelayRequest = {
  chainId: 8453,
  from: `0x${'11'.repeat(20)}`,
  to: `0x${'22'.repeat(20)}`,
  value: '1000000',
  validAfter: String(NOW - 10),
  validBefore: String(NOW + 600),
  nonce: `0x${'33'.repeat(32)}`,
  v: 27,
  r: `0x${'44'.repeat(32)}`,
  s: `0x${'55'.repeat(32)}`,
}

/** NEAR's real answer for a waiting deposit, for Base USDC with a 1 USDC minimum, with any changes, parsed. */
function status(changes: { status?: string; originAsset?: string; minAmountIn?: string } = {}) {
  const live = NEAR_STATUS_PENDING
  return parseNearStatus({
    ...live,
    status: changes.status ?? 'PENDING_DEPOSIT',
    quoteResponse: {
      ...live.quoteResponse,
      quoteRequest: { ...live.quoteResponse.quoteRequest, originAsset: changes.originAsset ?? BASE_USDC },
      quote: { ...live.quoteResponse.quote, minAmountIn: changes.minAmountIn ?? '1000000' },
    },
  })
}

describe('gas relayer policy', () => {
  it('accepts a fresh Base USDC authorisation for a waiting NEAR deposit', () => {
    expect(checkStatic(request, NOW)).toBeUndefined()
    expect(checkNearDeposit(request, status())).toBeUndefined()
  })

  it('refuses other chains, expired, not-yet-valid and long-lived authorisations', () => {
    expect(checkStatic({ ...request, chainId: 1 }, NOW)).toMatch(/chain/)
    expect(checkStatic({ ...request, validBefore: String(NOW - 1) }, NOW)).toMatch(/expired/)
    expect(checkStatic({ ...request, validAfter: String(NOW + 60) }, NOW)).toMatch(/not valid yet/)
    expect(checkStatic({ ...request, validBefore: String(NOW + 7200) }, NOW)).toMatch(/too long/)
  })

  it('refuses a deposit address that is not waiting, is for another asset, or wants more', () => {
    expect(checkNearDeposit(request, status({ status: 'PROCESSING' }))).toMatch(/not waiting/)
    expect(checkNearDeposit(request, status({ originAsset: 'nep141:other' }))).toMatch(/not for USDC/)
    expect(checkNearDeposit(request, status({ minAmountIn: '2000000' }))).toMatch(/does not cover/)
  })

  it('limits requests per key within the window', () => {
    const allow = createLimiter(2, 1_000)
    expect(allow('a', 0)).toBe(true)
    expect(allow('a', 10)).toBe(true)
    expect(allow('a', 20)).toBe(false)
    expect(allow('b', 20)).toBe(true)
    expect(allow('a', 2_000)).toBe(true)
  })
})
