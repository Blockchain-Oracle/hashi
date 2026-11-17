'use client'

import { Alert02Icon, Clock01Icon, FlashIcon, Loading03Icon } from '@hugeicons/core-free-icons'
import type { UseQueryResult } from '@tanstack/react-query'
import { Icon } from '@/components/kit/icon'
import { BrandLogo } from '@/components/kit/logos'
import { StatusPill } from '@/components/kit/status-pill'
import { BCH_ASSETS } from '@/lib/constants/assets'
import {
  type BridgePair,
  PROVIDERS,
  type ProviderId,
  type QuoteRequest,
  type RouteOutcome,
} from '@/lib/engine/types'
import { formatAmount, formatDuration, formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'

const REASON: Record<Extract<RouteOutcome, { ok: false }>['reason'], string> = {
  halted: 'Paused',
  'below-minimum': 'Below minimum',
  unsupported: 'Not offered',
  'no-liquidity': 'Not enough liquidity',
  error: 'Unavailable',
}

/** JSON with bigints, for the raw provider responses. */
function stringify(value: unknown) {
  return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
}

export function RouteCard({
  provider,
  req,
  query,
  best,
  fastest,
}: {
  provider: ProviderId
  req: QuoteRequest<BridgePair>
  query: UseQueryResult<RouteOutcome>
  best: boolean
  fastest: boolean
}) {
  const { pair } = req
  const payDecimals = pair.direction === 'in' ? pair.stable.decimals : BCH_ASSETS[pair.bchAsset].decimals
  const receiveDecimals = pair.direction === 'in' ? BCH_ASSETS[pair.bchAsset].decimals : pair.stable.decimals
  const receiveSymbol = pair.direction === 'in' ? pair.bchAsset : pair.stable.symbol
  const paySymbol = pair.direction === 'in' ? pair.stable.symbol : pair.bchAsset
  const outcome = query.data

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-card transition-colors',
        best ? 'border-primary/40 ring-4 ring-primary/10' : 'border-border',
      )}
    >
      <header className="flex items-center gap-3">
        <BrandLogo brand={provider} size={32} />
        <div>
          <p className="font-medium">{PROVIDERS[provider].name}</p>
          {pair.bchAsset !== 'BCH' ? (
            <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
              then <BrandLogo brand="cauldron" size={14} /> Cauldron
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex gap-1.5">
          {best ? (
            <StatusPill tone="vermilion" icon={<Icon icon={FlashIcon} />}>
              Best return
            </StatusPill>
          ) : null}
          {fastest ? (
            <StatusPill tone="ink" icon={<Icon icon={Clock01Icon} />}>
              Fastest
            </StatusPill>
          ) : null}
        </div>
      </header>

      {!outcome ? (
        query.isError ? (
          <p className="text-destructive text-sm">{query.error.message}</p>
        ) : (
          <div className="space-y-2">
            <div className="h-12 w-2/3 animate-pulse rounded-xl bg-foreground/[0.06]" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-foreground/[0.06]" />
          </div>
        )
      ) : outcome.ok ? (
        <>
          <div>
            <p className="label-mono">You receive</p>
            <p
              className={cn('mt-1 text-[2.5rem] leading-none text-amount', query.isFetching && 'opacity-70')}
            >
              {formatAmount(outcome.route.amountOut, receiveDecimals, receiveDecimals > 2 ? 6 : 2)}{' '}
              <span className="font-sans text-muted-foreground text-xl tracking-normal">{receiveSymbol}</span>
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              At least {formatAmount(outcome.route.minAmountOut, receiveDecimals, 6)} {receiveSymbol}
              {outcome.route.usdIn !== undefined && outcome.route.usdOut !== undefined
                ? ` · NEAR values ${formatUsd(outcome.route.usdIn)} → ${formatUsd(outcome.route.usdOut)}`
                : ''}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Row label="Arrives in" value={formatDuration(outcome.route.etaSeconds)} />
            <Row label="Approvals" value={String(outcome.route.signatures)} />
            <Row
              label="BCH across the bridge"
              value={`${formatAmount(outcome.route.bridgeSats, 8, 8)} BCH`}
            />
            {outcome.route.cauldron ? (
              <>
                <Row label="Cauldron pools" value={String(outcome.route.cauldron.pools)} />
                <Row
                  label="Router fee + miner"
                  value={`${(outcome.route.cauldron.routerFeeSats + outcome.route.cauldron.minerFeeSats).toLocaleString('en-US')} sats`}
                />
                {outcome.route.cauldron.partial ? <Row label="Fill" value="Partial" /> : null}
              </>
            ) : null}
          </dl>
        </>
      ) : (
        <div className="space-y-2">
          <StatusPill
            tone={outcome.reason === 'halted' ? 'warning' : 'ink'}
            icon={<Icon icon={Alert02Icon} />}
          >
            {REASON[outcome.reason]}
          </StatusPill>
          <p className="text-muted-foreground text-sm">{outcome.message}</p>
          {outcome.minimum !== undefined ? (
            <p className="text-sm">
              Minimum: {formatAmount(outcome.minimum, payDecimals, 6)} {paySymbol}
            </p>
          ) : null}
        </div>
      )}

      <footer className="mt-auto flex items-center gap-2 border-border border-t pt-3 text-muted-foreground text-xs">
        {query.isFetching ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
        <span className="font-mono">
          {query.dataUpdatedAt ? `Priced ${new Date(query.dataUpdatedAt).toLocaleTimeString()}` : 'Pricing…'}
        </span>
        {outcome ? (
          <details className="ml-auto">
            <summary className="cursor-pointer select-none font-mono">Raw responses</summary>
            <pre className="mt-2 max-h-72 max-w-[calc(100vw-4rem)] overflow-auto rounded-xl bg-muted p-3 text-[0.6875rem] leading-snug">
              {stringify(outcome.ok ? outcome.route.raw : outcome)}
            </pre>
          </details>
        ) : null}
      </footer>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}
