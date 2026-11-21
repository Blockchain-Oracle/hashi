'use client'

import { ArrowRight01Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
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
  const days = Math.round(hours / 24)
  return `${days} d ago`
}

function amount(value: string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return n >= 1
    ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : n.toPrecision(3).replace(/0+$/, '')
}

function Leg({ side }: { side: Side }) {
  const asset = side.asset as StableSymbol | BchAssetId
  return (
    <span className="inline-flex items-center gap-2">
      {side.chain === 'bch' ? (
        <AssetLogo asset={asset} size={22} />
      ) : (
        <AssetOnChain asset={asset} chain={side.chain} size={22} />
      )}
      <span className="font-mono tabular-nums">{amount(side.amount)}</span>
      <span className="font-medium">{side.asset}</span>
      <span className="text-muted-foreground max-sm:hidden">on {CHAINS[side.chain].name}</span>
    </span>
  )
}

const STATUS: Record<Crossing['status'], { label: string; tone: string }> = {
  done: { label: 'Completed', tone: 'bg-(--success)/12 text-(--success)' },
  pending: { label: 'In progress', tone: 'bg-(--warning)/12 text-(--warning)' },
  refunded: { label: 'Refunded', tone: 'bg-muted text-muted-foreground' },
  failed: { label: 'Failed', tone: 'bg-destructive/12 text-destructive' },
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
    <div className="flex flex-col gap-4">
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

      <ol className="flex flex-col">
        {shown.map((c) => (
          <li
            key={c.id}
            className="grid gap-3 border-border border-t py-4 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center sm:gap-5"
          >
            <span className="font-mono text-muted-foreground text-xs">{ago(c.at, now)}</span>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.9375rem]">
                <Leg side={c.pay} />
                <Icon icon={ArrowRight01Icon} className="text-muted-foreground" />
                <Leg side={c.get} />
                <span className={cn('rounded-full px-2.5 py-0.5 font-medium text-xs', STATUS[c.status].tone)}>
                  {STATUS[c.status].label}
                </span>
              </div>
              {c.via ? (
                <span className="text-muted-foreground text-xs">
                  {amount(c.via.amount)} BCH reached its swap contract, which traded it on Cauldron in one go
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {c.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {link.label}
                  <Icon icon={ArrowUpRight01Icon} size={14} />
                </a>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
