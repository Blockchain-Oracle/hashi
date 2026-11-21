'use client'

import { ArrowDownLeft01Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, AssetOnChain } from '@/components/kit/logos'
import type { BchAssetId, StableSymbol } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import type { Crossing, Side } from '@/lib/explorer/crossings.server'
import { cn } from '@/lib/utils'

const REFRESH_MS = 30_000

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Into Bitcoin Cash' },
  { key: 'out', label: 'Out of Bitcoin Cash' },
] as const

function ago(at: number, now: number) {
  const minutes = Math.max(0, Math.round((now - at) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

function amount(value: string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return n >= 1 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(Number(n.toPrecision(3)))
}

/** One side of a crossing: the coin with its chain, the amount, and the chain's name under it. */
function Leg({ side }: { side: Side }) {
  const asset = side.asset as StableSymbol | BchAssetId
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {side.chain === 'bch' ? (
        <AssetLogo asset={asset} size={32} />
      ) : (
        <AssetOnChain asset={asset} chain={side.chain} size={32} />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="whitespace-nowrap font-medium text-[0.9375rem] leading-tight sm:text-[1.0625rem]">
          <span className="font-mono tabular-nums">{amount(side.amount)}</span> {side.asset}
        </span>
        <span className="truncate text-muted-foreground text-xs">{CHAINS[side.chain].name}</span>
      </span>
    </span>
  )
}

const STATUS: Record<Crossing['status'], { label: string; dot: string }> = {
  done: { label: 'Completed', dot: 'bg-(--success)' },
  pending: { label: 'In progress', dot: 'bg-(--warning)' },
  refunded: { label: 'Refunded', dot: 'bg-muted-foreground' },
  failed: { label: 'Failed', dot: 'bg-destructive' },
}

function route(c: Crossing) {
  if (c.via) return 'NEAR Intents → swap contract → Cauldron'
  return c.direction === 'in' ? 'NEAR Intents' : 'Bitcoin Cash → NEAR Intents'
}

/** The list of crossings, newest first, with a direction filter; the page re-reads the ledger every 30 s. */
export function CrossingFeed({ crossings }: { crossings: Crossing[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
      router.refresh()
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [router])

  const shown = crossings.filter((c) => filter === 'all' || c.direction === filter)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Direction">
          {FILTERS.map((f) => {
            const count =
              f.key === 'all' ? crossings.length : crossings.filter((c) => c.direction === f.key).length
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 font-medium text-[0.9375rem] transition-colors',
                  filter === f.key ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70',
                )}
              >
                {f.label}
                <span className="font-mono text-xs opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
        <span className="flex items-center gap-2 font-mono text-muted-foreground text-xs">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--success) opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-(--success)" />
          </span>
          LIVE · REFRESHES EVERY 30 S
        </span>
      </div>

      <ol className="flex flex-col gap-3">
        {shown.map((c) => (
          <li
            key={c.id}
            className="grid gap-4 rounded-3xl bg-card p-4 shadow-card ring-1 ring-border sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8"
          >
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                <span
                  className={cn(
                    'hidden size-9 shrink-0 place-items-center rounded-xl sm:grid',
                    c.direction === 'in'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-foreground text-background',
                  )}
                  title={c.direction === 'in' ? 'Into Bitcoin Cash' : 'Out of Bitcoin Cash'}
                >
                  <Icon icon={c.direction === 'in' ? ArrowDownLeft01Icon : ArrowUpRight01Icon} size={18} />
                </span>
                <Leg side={c.pay} />
                <svg viewBox="0 0 56 20" className="w-8 shrink-0 text-primary sm:w-14" aria-hidden>
                  <path
                    d="M2 17C14 2 42 2 54 17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M47 13.5l7 3.5-6.5 3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <Leg side={c.get} />
              </div>
              <span className="font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.08em] sm:pl-13">
                {route(c)}
              </span>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <span className="flex items-center gap-2 text-sm">
                <span className={cn('size-2 rounded-full', STATUS[c.status].dot)} aria-hidden />
                <span className="font-medium">{STATUS[c.status].label}</span>
                <span className="text-muted-foreground">· {ago(c.at, now)}</span>
              </span>
              <div className="flex flex-wrap gap-1.5 lg:justify-end">
                {c.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {link.label}
                    <Icon icon={ArrowUpRight01Icon} size={12} />
                  </a>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
