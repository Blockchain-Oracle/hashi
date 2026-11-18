'use client'

import { ArrowRight01Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { HashiMark } from '@/components/kit/hashi-mark'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain } from '@/components/kit/logos'
import { StatusPill } from '@/components/kit/status-pill'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CHAINS } from '@/lib/constants/chains'
import { finishArrival } from '@/lib/engine/arrival'
import { tradesOnArrival } from '@/lib/engine/arrival-terms'
import { checkBridge, nextStep } from '@/lib/engine/runner'
import { isTerminal, type SwapRecord } from '@/lib/engine/swap'
import { PROVIDERS } from '@/lib/engine/types'
import { displayDecimals, formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { paySide, receiveSide } from './steps'
import { persistSwap, useSwapRecords } from './store'
import { statusPill } from './tracker'

type Filter = 'all' | 'active' | 'completed' | 'problem'

const FILTERS: { id: Filter; label: string; test: (r: SwapRecord) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'active', label: 'In progress', test: (r) => !isTerminal(r) },
  { id: 'completed', label: 'Completed', test: (r) => r.status === 'completed' },
  {
    id: 'problem',
    label: 'Refunded, failed or expired',
    test: (r) => isTerminal(r) && r.status !== 'completed',
  },
]

const RECHECK_MS = 20_000

function ago(at: number, now: number) {
  const minutes = Math.round((now - at) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Every swap started in this browser (feature 9). Swaps still with a bridge are re-checked live in the
 * background, so the list is current without opening each one; any row reopens its tracker.
 */
export function ActivityList() {
  const records = useSwapRecords()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [now, setNow] = useState(() => Date.now())
  const checking = useRef(false)

  // Swaps the bridge is still working on, and swap contracts holding BCH to trade (no approval needed for those).
  const waiting = useMemo(
    () =>
      records.data?.filter(
        (r) => nextStep(r) === 'wait' || (nextStep(r) === 'finish' && tradesOnArrival(r)),
      ) ?? [],
    [records.data],
  )
  useEffect(() => {
    if (!waiting.length) return
    const tick = async () => {
      if (checking.current) return
      checking.current = true
      try {
        for (const record of waiting) {
          const step = nextStep(record) === 'wait' ? checkBridge : finishArrival
          const next = await step(record, () => {}).catch(() => record)
          if (next !== record) await persistSwap(queryClient, next)
        }
      } finally {
        checking.current = false
        setNow(Date.now())
      }
    }
    void tick()
    const timer = setInterval(() => void tick(), RECHECK_MS)
    return () => clearInterval(timer)
  }, [waiting, queryClient])

  const shown = records.data?.filter(FILTERS.find((f) => f.id === filter)?.test ?? (() => true)) ?? []

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pt-10 sm:pt-14">
      <div className="flex flex-col gap-2">
        <p className="label-mono">/ Activity</p>
        <h1 className="text-title">Your swaps</h1>
        <p className="text-muted-foreground">
          Saved in this browser. Swaps still on their way are checked live.
        </p>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const count = records.data?.filter(f.test).length ?? 0
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                'flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 font-medium text-sm transition-colors',
                filter === f.id ? 'bg-foreground text-background' : 'bg-muted hover:bg-accent',
              )}
            >
              {f.label}
              <span
                className={cn('font-mono text-xs', filter === f.id ? 'opacity-70' : 'text-muted-foreground')}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {records.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="h-20 rounded-3xl" />
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-border border-dashed px-6 py-16 text-center">
          <HashiMark size="lg" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-lg">{filter === 'all' ? 'No swaps yet' : 'Nothing here'}</p>
            <p className="max-w-sm text-muted-foreground text-sm">
              {filter === 'all'
                ? 'Move USDC or USDT to PUSD, MUSD or BCH, or back. Every swap you start shows up here.'
                : 'No swaps match this filter.'}
            </p>
          </div>
          {filter === 'all' ? (
            <Button render={<Link href="/swap" />} nativeButton={false}>
              Start a swap
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((record) => (
            <li key={record.id}>
              <Row record={record} now={now} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({ record, now }: { record: SwapRecord; now: number }) {
  const pay = paySide(record)
  const receive = receiveSide(record)
  const pill = statusPill(record)
  const out = record.receivedAmount ?? record.quoted?.amountOut
  return (
    <Link
      href={`/activity/${record.id}`}
      className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-card transition-colors hover:bg-muted/60"
    >
      <span className="relative flex shrink-0">
        <AssetOnChain asset={pay.symbol} chain={pay.chain} size={34} />
        <AssetOnChain
          asset={receive.symbol}
          chain={receive.chain}
          size={34}
          className="-ml-2 rounded-full ring-2 ring-card"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5 font-medium">
          {formatAmount(BigInt(record.amountIn), pay.decimals, displayDecimals(pay.symbol))} {pay.symbol}
          <Icon icon={ArrowRight02Icon} className="text-muted-foreground" />
          {out
            ? `${record.receivedAmount ? '' : '≈ '}${formatAmount(BigInt(out), receive.decimals, displayDecimals(receive.symbol))} `
            : ''}
          {receive.symbol}
        </span>
        <span className="block truncate text-muted-foreground text-sm">
          {CHAINS[pay.chain].name} → {CHAINS[receive.chain].name} · {PROVIDERS[record.provider].name} ·{' '}
          {ago(record.createdAt, now)}
        </span>
      </span>
      <StatusPill tone={pill.tone} className="h-7 px-3 text-xs max-sm:hidden">
        {pill.label}
      </StatusPill>
      <Icon
        icon={ArrowRight01Icon}
        className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}
