import { describe, expect, it } from 'vitest'
import { STABLES } from '@/lib/constants/assets'
import { rankRoutes } from './rank'
import type { BridgePair, ProviderId, Route, RouteOutcome } from './types'

const pair: BridgePair = { direction: 'in', stable: STABLES[0] as BridgePair['stable'], bchAsset: 'PUSD' }

function route(provider: ProviderId, amountOut: bigint, etaSeconds: number): RouteOutcome {
  const r: Route = {
    provider,
    pair,
    amountIn: 1_000_000n,
    amountOut,
    minAmountOut: amountOut,
    bridgeSats: 0n,
    etaSeconds,
    signatures: 2,
    quotedAt: 0,
    raw: { bridge: null },
  }
  return { ok: true, route: r }
}

describe('route ranking', () => {
  it('puts the best return first and labels a different fastest route', () => {
    const ranked = rankRoutes([route('thorchain', 990n, 30), route('near', 998n, 160)])
    expect(ranked.routes.map((r) => r.provider)).toEqual(['near', 'thorchain'])
    expect(ranked.bestReturn).toBe('near')
    expect(ranked.fastest).toBe('thorchain')
  })

  it('does not label fastest when the best route is also the fastest', () => {
    const ranked = rankRoutes([route('near', 998n, 30), route('thorchain', 990n, 60)])
    expect(ranked.fastest).toBeUndefined()
  })

  it('breaks a tie on amount by time', () => {
    const ranked = rankRoutes([route('near', 998n, 90), route('thorchain', 998n, 30)])
    expect(ranked.bestReturn).toBe('thorchain')
  })

  it('keeps unavailable routes apart, with their reason', () => {
    const halted: RouteOutcome = { ok: false, provider: 'thorchain', reason: 'halted', message: 'paused' }
    const ranked = rankRoutes([route('near', 998n, 30), halted])
    expect(ranked.routes).toHaveLength(1)
    expect(ranked.unavailable).toEqual([halted])
  })

  it('counts gas paid outside the quote against its route', () => {
    // THORChain quotes 2 units more but its approval and deposit cost 5 units of gas; NEAR's transfer costs 1.
    const ranked = rankRoutes([route('thorchain', 1000n, 30), route('near', 998n, 160)], {
      thorchain: 5n,
      near: 1n,
    })
    expect(ranked.bestReturn).toBe('near')
    expect(ranked.fastest).toBe('thorchain')
  })

  it('has no best route when nothing is live', () => {
    expect(rankRoutes([]).bestReturn).toBeUndefined()
  })
})
