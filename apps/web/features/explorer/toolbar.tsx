'use client'

import { ArrowDown01Icon, Cancel01Icon, Search01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, ChainLogo } from '@/components/kit/logos'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import type { BchAssetId, StableSymbol } from '@/lib/constants/assets'
import { CHAINS, type ChainId } from '@/lib/constants/chains'
import type { Crossing } from '@/lib/explorer/crossings.server'
import { cn } from '@/lib/utils'
import { STATUS } from './status'

const SEARCH_DEBOUNCE_MS = 300

interface Option {
  id: string
  name: string
  n: number
  logo: ReactNode
}

/**
 * A filter as a picker: the button shows the chosen option's logo (or the first few, stacked, for "all"); the menu
 * lists every option with its logo, its name and how many swaps it has, and a tick on the one in use.
 */
function Picker({
  label,
  allLabel,
  value,
  options,
  total,
  onChange,
}: {
  label: string
  allLabel: string
  value: string
  options: Option[]
  /** Swaps in all: a swap counts once even when both of its coins are listed. */
  total: number
  onChange: (id: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const chosen = options.find((o) => o.id === value)
  const row = (id: string | undefined, logo: ReactNode, name: string, n: number) => {
    const on = (id ?? '') === value
    return (
      <button
        key={id ?? 'all'}
        type="button"
        onClick={() => {
          onChange(id)
          setOpen(false)
        }}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
          on ? 'bg-muted' : 'hover:bg-muted/60',
        )}
      >
        <span className="flex w-7 shrink-0 justify-center">{logo}</span>
        <span className="flex-1 font-medium">{name}</span>
        <span className="font-mono text-muted-foreground text-xs tabular-nums">{n}</span>
        <span className="flex w-4 justify-center text-primary">
          {on ? <Icon icon={Tick02Icon} size={16} /> : null}
        </span>
      </button>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          'flex h-10 items-center gap-2 rounded-full py-1 pr-3 pl-1.5 font-medium text-sm transition-colors',
          chosen ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70',
        )}
      >
        {chosen ? (
          <span className="rounded-full bg-card p-0.5">{chosen.logo}</span>
        ) : (
          <span className="flex -space-x-2 pl-0.5">
            {options.slice(0, 3).map((o) => (
              <span key={o.id} className="rounded-full bg-card p-0.5 ring-2 ring-muted">
                {o.logo}
              </span>
            ))}
          </span>
        )}
        {chosen ? chosen.name : allLabel}
        <Icon icon={ArrowDown01Icon} size={14} className="opacity-60" />
      </PopoverTrigger>
      <PopoverPopup align="start" sideOffset={8} className="w-64 rounded-2xl p-1.5">
        <div className="flex flex-col">
          {row(
            undefined,
            <span className="font-mono text-muted-foreground text-xs">ALL</span>,
            allLabel,
            total,
          )}
          {options.map((o) => row(o.id, o.logo, o.name, o.n))}
        </div>
      </PopoverPopup>
    </Popover>
  )
}

/**
 * Search and filters for /explorer. Everything lives in the link (?q=&dir=&chain=&coin=&status=&page=), so the server answers
 * with one page of the matching swaps, however many there are, and any view can be shared.
 */
export function ExplorerToolbar({
  chains,
  coins,
  statuses,
  counts,
}: {
  chains: { id: ChainId; n: number }[]
  coins: { id: string; n: number }[]
  /** Every status in the filter's order, with its count (zero included). */
  statuses: { id: Crossing['status']; n: number }[]
  counts: { all: number; in: number; out: number }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function update(next: Record<string, string | undefined>) {
    const search = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value)
      else search.delete(key)
    }
    search.delete('page')
    const query = search.toString()
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false })
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  const dir = params.get('dir') ?? ''
  const chain = params.get('chain') ?? ''
  const coin = params.get('coin') ?? ''
  const status = params.get('status') ?? ''
  const filtered = Boolean(params.get('q') || dir || chain || coin || status)

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-12 items-center gap-3 rounded-2xl bg-card px-4 shadow-card ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/40">
        <Icon icon={Search01Icon} className="text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            const value = e.target.value
            setQ(value)
            clearTimeout(timer.current)
            timer.current = setTimeout(() => update({ q: value.trim() || undefined }), SEARCH_DEBOUNCE_MS)
          }}
          placeholder="Search a transaction, an address or an amount"
          aria-label="Search swaps"
          className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-muted-foreground"
        />
        {q ? (
          <button
            type="button"
            aria-label="Clear the search"
            onClick={() => {
              setQ('')
              update({ q: undefined })
            }}
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        ) : null}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label="Direction">
          {(
            [
              { key: '', short: 'All', long: 'All', n: counts.all },
              { key: 'in', short: 'In', long: 'Into Bitcoin Cash', n: counts.in },
              { key: 'out', short: 'Out', long: 'Out of Bitcoin Cash', n: counts.out },
            ] as const
          ).map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              role="tab"
              aria-selected={dir === f.key}
              onClick={() => update({ dir: f.key || undefined })}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium text-sm transition-colors',
                dir === f.key
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-foreground/70 hover:text-foreground',
              )}
            >
              <span className="sm:hidden">{f.short}</span>
              <span className="hidden sm:inline">{f.long}</span>
              <span className="font-mono text-xs opacity-60">{f.n}</span>
            </button>
          ))}
        </div>
        <Picker
          label="Chain"
          allLabel="All chains"
          value={chain}
          total={counts.all}
          onChange={(id) => update({ chain: id })}
          options={chains.map((c) => ({
            id: c.id,
            name: CHAINS[c.id].name,
            n: c.n,
            logo: <ChainLogo chain={c.id} size={22} />,
          }))}
        />
        <Picker
          label="Coin"
          allLabel="All coins"
          value={coin}
          total={counts.all}
          onChange={(id) => update({ coin: id })}
          options={coins.map((c) => ({
            id: c.id,
            name: c.id,
            n: c.n,
            logo: <AssetLogo asset={c.id as StableSymbol | BchAssetId} size={22} />,
          }))}
        />
        <Picker
          label="Status"
          allLabel="Any status"
          value={status}
          total={counts.all}
          onChange={(id) => update({ status: id })}
          options={statuses.map((st) => ({
            id: st.id,
            name: STATUS[st.id].label,
            n: st.n,
            logo: (
              <span className="grid size-[22px] place-items-center">
                <span className={cn('size-2.5 rounded-full', STATUS[st.id].dot)} />
              </span>
            ),
          }))}
        />
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setQ('')
              router.replace(pathname as Route, { scroll: false })
            }}
            className="h-10 rounded-full px-3 font-medium text-primary text-sm hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}
