'use client'

import { Clock01Icon, FlashIcon, GasPipeIcon, SignatureIcon } from '@hugeicons/core-free-icons'
import { motion, useReducedMotion } from 'motion/react'
import { Fragment } from 'react'
import { formatUnits } from 'viem'
import { Icon } from '@/components/kit/icon'
import { BrandLogo } from '@/components/kit/logos'
import { StatusPill } from '@/components/kit/status-pill'
import { AnimatedBackground } from '@/components/ui/animated-background'
import { BorderBeam } from '@/components/ui/border-beam'
import { Skeleton } from '@/components/ui/skeleton'
import { QUOTE_REFETCH_MS } from '@/lib/constants/limits'
import { PROVIDERS, type Route, type RouteOutcome, type RouteVia } from '@/lib/engine/types'
import { displayDecimals, formatAmount, formatDuration, formatUsd, minimumToShow } from '@/lib/format'
import { LINKS } from '@/lib/links'
import { cn } from '@/lib/utils'
import type { Swap } from './use-swap'

const REASON: Record<Extract<RouteOutcome, { ok: false }>['reason'], string> = {
  halted: 'Paused',
  'below-minimum': 'Too small',
  unsupported: 'Not offered',
  'no-liquidity': 'Low liquidity',
  error: 'Unavailable',
}

/**
 * Who carries a route, in the order the money meets them: the bridge then Cauldron going into Bitcoin Cash,
 * Cauldron then the bridge coming out, or Cauldron alone when both sides are on Bitcoin Cash.
 */
export function routeLegs(route: Route): RouteVia[] {
  if (route.provider === 'cauldron') return ['cauldron']
  if (!route.cauldron) return [route.provider]
  return route.pair.direction === 'in' ? [route.provider, 'cauldron'] : ['cauldron', route.provider]
}

/** The route's legs as words: "NEAR Intents → Cauldron", or "Cauldron · no bridge". */
export function RouteName({ route, logos = false }: { route: Route; logos?: boolean }) {
  const legs = routeLegs(route)
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      {legs.map((leg, i) => (
        <Fragment key={leg}>
          {i > 0 ? (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          ) : null}
          {/* The route's own carrier (its big logo) reads first; the other leg is quieter. */}
          <span
            className={cn(
              'flex items-center gap-1',
              leg !== route.provider && !logos && 'text-muted-foreground',
            )}
          >
            {logos ? <BrandLogo brand={leg} size={16} /> : null}
            {PROVIDERS[leg].name}
          </span>
        </Fragment>
      ))}
      {route.provider === 'cauldron' ? <span className="text-muted-foreground">· no bridge</span> : null}
    </span>
  )
}

/** Drains over the refresh interval and restarts whenever a fresh quote lands. */
/** The bridge's minimum as one tap: the amount it shows is the amount it fills in. */
function UseMinimum({
  amount,
  symbol,
  onUse,
}: {
  amount: string
  symbol: string
  onUse: (amount: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onUse(amount)}
      className="shrink-0 rounded-full bg-muted px-3 py-1 font-mono text-xs transition-colors hover:bg-accent"
    >
      Use {amount} {symbol}
    </button>
  )
}

function RefreshRing({ updatedAt, fetching }: { updatedAt: number; fetching: boolean }) {
  const still = useReducedMotion()
  return (
    <span className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs">
      {fetching ? 'Updating' : 'Live'}
      <svg viewBox="0 0 16 16" className="size-3.5 -rotate-90" aria-hidden>
        <circle cx="8" cy="8" r="6" fill="none" strokeWidth="2" className="stroke-foreground/10" />
        {updatedAt && !still ? (
          <motion.circle
            key={updatedAt}
            cx="8"
            cy="8"
            r="6"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            className="stroke-primary"
            initial={{ pathLength: 1 }}
            animate={{ pathLength: 0 }}
            transition={{ duration: QUOTE_REFETCH_MS / 1000, ease: 'linear' }}
          />
        ) : null}
      </svg>
    </span>
  )
}

/**
 * Every route for the pair, best return first. Each row says
 * what arrives after every fee, how long it takes, what it costs in dollars including gas on the paying chain,
 * and how many approvals it needs. Routes that cannot run say why; a too-small amount offers the minimum.
 */
export function RouteList({ swap, onUseMinimum }: { swap: Swap; onUseMinimum: (amount: string) => void }) {
  const { ranked, queries, selected, costs, receive, pay, pair, dispatch, updating } = swap
  // Only the routes that carry this pair: the two bridges, or Cauldron alone on Bitcoin Cash.
  const carriers: RouteVia[] = pair.direction === 'local' ? ['cauldron'] : ['near', 'thorchain']
  const pending = carriers.filter((p) => queries[p].isFetching && !queries[p].data)
  const updatedAt = Math.max(...carriers.map((p) => queries[p].dataUpdatedAt))
  const fetching = carriers.some((p) => queries[p].isFetching)
  const fraction = displayDecimals(receive.symbol)

  if (!swap.req) return null

  return (
    <section aria-label="Routes" className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2">
        <span className="flex items-baseline gap-2">
          <span className="label-mono">/ Routes</span>
          <a
            href={LINKS.routes}
            className="text-muted-foreground text-xs underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:text-foreground"
          >
            How they're ranked ↗
          </a>
        </span>
        {ranked.routes.length || ranked.unavailable.length ? (
          <RefreshRing updatedAt={updatedAt} fetching={fetching} />
        ) : null}
      </div>

      {ranked.routes.length ? (
        <AnimatedBackground
          {...(selected ? { defaultValue: selected.provider } : {})}
          onValueChange={(id) => id && dispatch({ type: 'route', provider: id as RouteVia })}
          className="rounded-[1.25rem] bg-muted shadow-[inset_0_0_0_1.5px_var(--foreground)]"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        >
          {ranked.routes.map((route) => {
            const best = route.provider === ranked.bestReturn
            const fastest = route.provider === ranked.fastest
            const cost = costs[route.provider]
            return (
              <button
                key={route.provider}
                data-id={route.provider}
                type="button"
                aria-pressed={route.provider === selected?.provider}
                className="w-full rounded-[1.25rem] text-left"
              >
                <span
                  className={cn(
                    'relative flex w-full items-center gap-3 overflow-hidden rounded-[1.25rem] px-3.5 py-3 transition-opacity',
                    updating && 'opacity-60',
                  )}
                >
                  {best ? (
                    // Two laps when a route becomes the best, then it rests: an endless beam keeps the card repainting.
                    <BorderBeam
                      size={90}
                      duration={3.5}
                      colorFrom="#ff2f00"
                      colorTo="#fdc830"
                      transition={{ repeat: 1 }}
                    />
                  ) : null}
                  <span className="relative shrink-0">
                    <BrandLogo brand={route.provider} size={34} />
                    {route.cauldron && route.provider !== 'cauldron' ? (
                      <BrandLogo
                        brand="cauldron"
                        size={16}
                        className="absolute -right-1 -bottom-1 ring-2 ring-card"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">
                        <RouteName route={route} />
                      </span>
                      {best ? (
                        <StatusPill
                          tone="vermilion"
                          icon={<Icon icon={FlashIcon} />}
                          className="h-6 px-2.5 text-xs"
                        >
                          Best return
                        </StatusPill>
                      ) : null}
                      {fastest ? (
                        <StatusPill
                          tone="ink"
                          icon={<Icon icon={Clock01Icon} />}
                          className="h-6 px-2.5 text-xs"
                        >
                          Fastest
                        </StatusPill>
                      ) : null}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1">
                        <Icon icon={Clock01Icon} />
                        {formatDuration(route.etaSeconds)}
                      </span>
                      {cost ? (
                        <span className="flex items-center gap-1">
                          <Icon icon={GasPipeIcon} />
                          {formatUsd(cost.totalUsd)} in fees
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <Icon icon={SignatureIcon} />
                        {route.signatures} {route.signatures === 1 ? 'approval' : 'approvals'}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[1.0625rem]">
                      {formatAmount(route.amountOut, receive.decimals, fraction)}
                    </span>
                    <span className="block text-muted-foreground text-xs">{receive.symbol}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </AnimatedBackground>
      ) : null}

      {pending.map((provider) =>
        ranked.routes.some((r) => r.provider === provider) ? null : (
          <div
            key={provider}
            className="flex items-center gap-3 rounded-[1.25rem] border border-border px-3.5 py-3"
          >
            <BrandLogo brand={provider} size={34} className="opacity-60" />
            <span className="flex-1 space-y-1.5">
              <span className="block text-muted-foreground text-sm">Asking {PROVIDERS[provider].name}…</span>
              <Skeleton className="h-2.5 w-2/3 rounded-full" />
            </span>
            <Skeleton className="h-5 w-16 rounded-lg" />
          </div>
        ),
      )}

      {ranked.unavailable.map((outcome) => (
        <div
          key={outcome.provider}
          className="flex items-center gap-3 rounded-[1.25rem] border border-border border-dashed px-3.5 py-2.5"
        >
          <BrandLogo brand={outcome.provider} size={26} className="opacity-50 grayscale" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground">{PROVIDERS[outcome.provider].name}</span>
              <StatusPill
                tone={outcome.reason === 'halted' ? 'warning' : 'ink'}
                className="h-5 px-2 text-[0.6875rem]"
              >
                {REASON[outcome.reason]}
              </StatusPill>
            </span>
            <span className="block truncate text-muted-foreground text-xs">{outcome.message}</span>
          </span>
          {outcome.minimum !== undefined && outcome.reason === 'below-minimum' ? (
            <UseMinimum
              amount={formatUnits(minimumToShow(outcome.minimum, pay.decimals, pay.symbol), pay.decimals)}
              symbol={pay.symbol}
              onUse={onUseMinimum}
            />
          ) : null}
        </div>
      ))}

      {pair.direction === 'in' && Object.keys(swap.depositFees).length === 0 && ranked.routes.length ? (
        <p className="px-2 text-muted-foreground text-xs">Reading gas prices…</p>
      ) : null}
    </section>
  )
}
