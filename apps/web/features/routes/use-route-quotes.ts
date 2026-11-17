'use client'

import { type QueryKey, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AMOUNT_DEBOUNCE_MS, QUOTE_REFETCH_MS, QUOTE_STALE_MS } from '@/lib/constants/limits'
import { quoteLocal } from '@/lib/engine/local-quote'
import { quoteRoute } from '@/lib/engine/quote'
import {
  type BridgePair,
  isLocal,
  type LocalPair,
  type Pair,
  type ProviderId,
  type QuoteRequest,
  type RouteOutcome,
  type RouteVia,
} from '@/lib/engine/types'

export const ROUTE_PROVIDERS: RouteVia[] = ['near', 'thorchain', 'cauldron']

/** The value, held back until it stops changing for `delay` ms. */
export function useDebounced<T>(value: T, delay = AMOUNT_DEBOUNCE_MS): T {
  const [held, setHeld] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setHeld(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return held
}

/** Direction, then the two assets: [chain, stablecoin, Bitcoin Cash asset], or [paid, received] on Bitcoin Cash. */
function pairKey(pair: Pair) {
  return isLocal(pair)
    ? ([pair.direction, 'bch', pair.from, pair.to] as const)
    : ([pair.direction, pair.stable.chain, pair.stable.symbol, pair.bchAsset] as const)
}

export function routeKey(provider: RouteVia, req: QuoteRequest) {
  return [
    'route',
    provider,
    ...pairKey(req.pair),
    req.amount.toString(),
    req.slippageBps,
    req.addresses?.stableSide ?? '',
    req.addresses?.bchPlain ?? '',
  ] as const
}

/** Key positions 2–5: the pair. */
function samePair(a: QueryKey, b: QueryKey) {
  return [2, 3, 4, 5].every((i) => a[i] === b[i])
}

/** The bridges carry bridged pairs; Cauldron alone carries pairs that stay on Bitcoin Cash. */
function carries(provider: RouteVia, pair: Pair) {
  return (provider === 'cauldron') === isLocal(pair)
}

function quote(provider: RouteVia, req: QuoteRequest, signal: AbortSignal): Promise<RouteOutcome> {
  if (provider === 'cauldron') return quoteLocal(req as QuoteRequest<LocalPair>)
  return quoteRoute(provider as ProviderId, req as QuoteRequest<BridgePair>, signal)
}

/**
 * One query per provider (a separate `useQuery` each: `keepPreviousData` is unreliable inside `useQueries`), so
 * each route appears as soon as its provider answers. Quotes are fresh for 10 s and refresh every 15 s; a changed
 * request aborts the old one. While a new amount is priced the previous result stays on screen, but only for the
 * same pair: an old USDC → PUSD amount never shows under a USDC → MUSD heading.
 */
export function useRouteQuote(provider: RouteVia, request: QuoteRequest | null) {
  // A provider that does not carry this pair stays idle (no quote, no stale result).
  const req = request && carries(provider, request.pair) ? request : null
  const queryKey = req ? routeKey(provider, req) : ['route', provider, 'idle']
  return useQuery({
    queryKey,
    queryFn: ({ signal }): Promise<RouteOutcome> => quote(provider, req as QuoteRequest, signal),
    enabled: Boolean(req && req.amount > 0n),
    staleTime: QUOTE_STALE_MS,
    refetchInterval: QUOTE_REFETCH_MS,
    placeholderData: (previous, previousQuery) =>
      previousQuery && samePair(previousQuery.queryKey, queryKey) ? previous : undefined,
    retry: 1,
  })
}
