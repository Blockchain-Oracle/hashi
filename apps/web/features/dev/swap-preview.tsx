'use client'

import { ArrowDataTransferVerticalIcon, Settings02Icon } from '@hugeicons/core-free-icons'
import NumberFlow from '@number-flow/react'
import { useState } from 'react'
import { Glow } from '@/components/kit/glow'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { BCH_ASSETS } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'

/**
 * The signature composition, as a specimen: the swap card on the vermilion glow, the amount in
 * large mono, the round swap button between the two sides, and the "finding routes" loading state.
 * No quote is invented here; the receive side and routes show their loading state.
 */
export function SwapPreview() {
  const [text, setText] = useState('25')
  const amount = Number.parseFloat(text) || 0

  return (
    <div className="relative mx-auto w-full max-w-[28rem]">
      <Glow />
      <div className="rounded-4xl border border-border bg-card p-2 shadow-float">
        <div className="flex items-center justify-between px-3 pt-2 pb-3">
          <span className="font-medium">Swap</span>
          <Button variant="ghost" size="icon-sm" aria-label="Settings">
            <Icon icon={Settings02Icon} />
          </Button>
        </div>

        <div className="rounded-3xl bg-muted p-4">
          <p className="label-mono">You pay</p>
          <div className="mt-2 flex items-center gap-3">
            <input
              inputMode="decimal"
              aria-label="Amount to pay"
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full min-w-0 bg-transparent text-[2.75rem] text-amount outline-none placeholder:text-muted-foreground"
              placeholder="0"
            />
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-card py-1.5 pr-3.5 pl-1.5 font-medium shadow-card">
              <AssetOnChain asset="USDC" chain="base" size={28} />
              USDC
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            on {CHAINS.base.name} ·{' '}
            <NumberFlow
              locales="en-US"
              value={amount}
              format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 2 }}
            />
          </p>
        </div>

        <div className="relative z-10 -my-4 flex justify-center">
          <button
            type="button"
            aria-label="Flip direction"
            className="flex size-11 items-center justify-center rounded-2xl border-4 border-card bg-muted text-foreground transition-transform hover:rotate-180"
          >
            <Icon icon={ArrowDataTransferVerticalIcon} size={20} />
          </button>
        </div>

        <div className="rounded-3xl bg-muted p-4">
          <p className="label-mono">You receive</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="h-11 w-40 animate-pulse rounded-xl bg-foreground/[0.06]" />
            <span className="ml-auto flex shrink-0 items-center gap-2 rounded-full bg-card py-1.5 pr-3.5 pl-1.5 font-medium shadow-card">
              <AssetOnChain asset="PUSD" chain="bch" size={28} />
              {BCH_ASSETS.PUSD.id}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">on Bitcoin Cash · {BCH_ASSETS.PUSD.name}</p>
        </div>

        <div className="space-y-2 px-1 pt-3">
          <p className="label-mono px-2">/ Finding routes</p>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border p-3">
              <span className="size-9 animate-pulse rounded-xl bg-foreground/[0.06]" />
              <span className="h-3 flex-1 animate-pulse rounded-full bg-foreground/[0.06]" />
              <span className="h-3 w-16 animate-pulse rounded-full bg-foreground/[0.06]" />
            </div>
          ))}
        </div>

        <div className="p-1 pt-3">
          <Button size="xl" disabled>
            Review swap
          </Button>
        </div>
      </div>
    </div>
  )
}
