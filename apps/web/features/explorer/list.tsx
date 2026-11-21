'use client'

import {
  ArrowDownLeft01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
} from '@hugeicons/core-free-icons'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, AssetOnChain } from '@/components/kit/logos'
import type { BchAssetId, StableSymbol } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import type { PublicCrossing, Side } from '@/lib/explorer/crossings.server'
import { cn } from '@/lib/utils'
import { STATUS } from './status'

const REFRESH_MS = 30_000

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

/** One side of a crossing: the coin with its chain, the whole amount, and the chain's name under it. */
function Leg({ side }: { side: Side }) {
  const asset = side.asset as StableSymbol | BchAssetId
  return (
    <span className="flex items-center gap-2.5">
      {side.chain === 'bch' ? (
        <AssetLogo asset={asset} size={32} />
      ) : (
        <AssetOnChain asset={asset} chain={side.chain} size={32} />
      )}
      <span className="flex flex-col">
        <span className="whitespace-nowrap font-medium text-[0.9375rem] leading-tight sm:text-[1.0625rem]">
          {/* Not known until the bridge settles that side (a swap in progress): a dash, never a made-up zero. */}
          {side.amount ? (
            <span className="font-mono tabular-nums">{amount(side.amount)}</span>
          ) : (
            <span className="font-mono text-muted-foreground" title="Known once the swap settles">
              —
            </span>
          )}{' '}
          {side.asset}
        </span>
        <span className="whitespace-nowrap text-muted-foreground text-xs">{CHAINS[side.chain].name}</span>
      </span>
    </span>
  )
}

/** The pages to offer: the first, the last, and the two either side of the current one; a gap is the next page, negated. */
function pageNumbers(page: number, pages: number): number[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))
  const sorted = [...wanted].sort((a, b) => a - b)
  return sorted.flatMap((n, i) => (i > 0 && n - (sorted[i - 1] ?? n) > 1 ? [-n, n] : [n]))
}

/** One page of crossings, newest first; the page re-reads the ledger every 30 s, keeping the search and filters. */
export function CrossingList({
  rows,
  total,
  page,
  pages,
  pageSize,
}: {
  rows: PublicCrossing[]
  total: number
  page: number
  pages: number
  pageSize: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
      router.refresh()
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [router])

  const href = (n: number) => {
    const search = new URLSearchParams(params.toString())
    if (n > 1) search.set('page', String(n))
    else search.delete('page')
    const query = search.toString()
    return (query ? `${pathname}?${query}` : pathname) as Route
  }
  const first = (page - 1) * pageSize + 1

  if (rows.length === 0) {
    return (
      <p className="rounded-3xl bg-muted p-6 text-foreground/70">
        No swap matches that. Try another search or filter.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 font-mono text-muted-foreground text-xs">
        <span>
          {first}–{first + rows.length - 1} OF {total}
        </span>
        <span className="flex items-center gap-2">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--success) opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-(--success)" />
          </span>
          LIVE
        </span>
      </div>

      <ol className="flex flex-col gap-3">
        {rows.map((c) => (
          <li
            key={c.id}
            className="grid gap-4 rounded-3xl bg-card p-4 shadow-card ring-1 ring-border sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8"
          >
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-4">
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
                {c.route}
              </span>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <span className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    STATUS[c.status].dot,
                    c.status === 'pending' && 'animate-pulse',
                  )}
                  aria-hidden
                />
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

      {pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-center gap-1.5 pt-2">
          <Link
            href={href(Math.max(1, page - 1))}
            scroll={false}
            aria-label="Previous page"
            aria-disabled={page === 1}
            className={cn(
              'grid size-10 place-items-center rounded-full bg-muted',
              page === 1 && 'pointer-events-none opacity-40',
            )}
          >
            <Icon icon={ArrowLeft01Icon} />
          </Link>
          {pageNumbers(page, pages).map((n) =>
            n < 0 ? (
              <span key={`gap-${-n}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={href(n)}
                scroll={false}
                aria-current={n === page ? 'page' : undefined}
                className={cn(
                  'grid h-10 min-w-10 place-items-center rounded-full px-3 font-mono text-sm tabular-nums',
                  n === page ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70',
                )}
              >
                {n}
              </Link>
            ),
          )}
          <Link
            href={href(Math.min(pages, page + 1))}
            scroll={false}
            aria-label="Next page"
            aria-disabled={page === pages}
            className={cn(
              'grid size-10 place-items-center rounded-full bg-muted',
              page === pages && 'pointer-events-none opacity-40',
            )}
          >
            <Icon icon={ArrowRight01Icon} />
          </Link>
        </nav>
      ) : null}
    </div>
  )
}
