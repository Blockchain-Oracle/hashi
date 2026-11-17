import type { Route, RouteOutcome, RouteVia } from './types'

export interface Ranked {
  /** Live routes, best return first (ties: the faster one first). */
  routes: Route[]
  /** Routes that cannot run right now, with why. */
  unavailable: Extract<RouteOutcome, { ok: false }>[]
  bestReturn?: RouteVia
  /** Set only when it is a different route from the best return. */
  fastest?: RouteVia
}

/** Fees paid outside a quote (gas on the paying chain), per route, in the receiving asset's base units. */
export type OutsideCosts = Partial<Record<RouteVia, bigint>>

/**
 * Best receive amount after all fees first; "fastest" is the
 * lowest end-to-end time. The best return is preselected. Gas the person pays on top of a quote (one transfer for
 * NEAR Intents, an approval and a deposit for THORChain) counts against that route, so "best" is what they keep.
 */
export function rankRoutes(outcomes: RouteOutcome[], outsideCosts: OutsideCosts = {}): Ranked {
  const routes: Route[] = []
  const unavailable: Ranked['unavailable'] = []
  for (const outcome of outcomes) {
    if (outcome.ok) routes.push(outcome.route)
    else unavailable.push(outcome)
  }
  const kept = (r: Route) => r.amountOut - (outsideCosts[r.provider] ?? 0n)
  routes.sort((a, b) => {
    const [ka, kb] = [kept(a), kept(b)]
    return ka === kb ? a.etaSeconds - b.etaSeconds : ka > kb ? -1 : 1
  })
  const best = routes[0]
  if (!best) return { routes, unavailable }
  const quickest = routes.reduce((a, b) => (b.etaSeconds < a.etaSeconds ? b : a))
  return {
    routes,
    unavailable,
    bestReturn: best.provider,
    ...(quickest.provider !== best.provider ? { fastest: quickest.provider } : {}),
  }
}
