'use client'

import { memo, type ReactNode } from 'react'
import { BrandLogo, ChainLogo } from '@/components/kit/logos'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { type Health, useProviderHealth } from '@/features/routes/use-provider-health'
import { BCH_ASSETS } from '@/lib/constants/assets'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'

const DOT: Record<Health, string> = {
  up: 'bg-(--success)',
  partial: 'bg-(--warning)',
  down: 'bg-(--destructive)',
  checking: 'bg-muted-foreground/40',
}

const WORD: Record<Health, string> = {
  up: 'Live',
  partial: 'Partly paused',
  down: 'Down',
  checking: 'Checking',
}

/** Live health of NEAR Intents, THORChain, the Cauldron Router and Electrum, behind one dot. */
export const StatusPopover = memo(function StatusPopover() {
  const { state, overall, halted, near, router, electrum } = useProviderHealth()
  const bchUsd = near.data?.find((t) => t.symbol === 'BCH')?.price

  return (
    <Popover>
      <PopoverTrigger
        className="flex h-8 items-center gap-2 rounded-full px-3 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Services: ${WORD[overall]}`}
      >
        <span className={cn('relative size-2 rounded-full', DOT[overall])}>
          {overall === 'up' ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-(--success) opacity-40 motion-reduce:hidden" />
          ) : null}
        </span>
        {WORD[overall]}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-[min(21rem,calc(100vw-2rem))]">
        <div className="flex flex-col gap-1 p-1">
          <p className="label-mono px-2 pb-2">/ Services, checked live</p>
          <Row
            logo={<BrandLogo brand="near" size={26} />}
            name="NEAR Intents"
            health={state.near}
            detail={bchUsd ? `BCH at $${bchUsd.toFixed(2)}` : 'Quotes and deposits'}
          />
          <Row
            logo={<BrandLogo brand="thorchain" size={26} />}
            name="THORChain"
            health={state.thorchain}
            detail={halted.length ? `Paused on ${halted.join(', ')}` : 'All Hashi chains open'}
          />
          <Row
            logo={<BrandLogo brand="cauldron" size={26} />}
            name="Cauldron Router"
            health={state.cauldron}
            detail={
              router.data
                ? `1 PUSD = ${formatAmount(router.data.sats, BCH_ASSETS.BCH.decimals, 8)} BCH · ${router.data.ms} ms`
                : 'PUSD and MUSD trades'
            }
          />
          <Row
            logo={<ChainLogo chain="bch" size={26} />}
            name="Bitcoin Cash network"
            health={state.electrum}
            detail={electrum.data ? `Block ${electrum.data.height.toLocaleString('en-US')}` : 'Electrum'}
          />
        </div>
      </PopoverPopup>
    </Popover>
  )
})

function Row({
  logo,
  name,
  health,
  detail,
}: {
  logo: ReactNode
  name: string
  health: Health
  detail: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      {logo}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-sm">{name}</span>
        <span className="block truncate font-mono text-muted-foreground text-xs">{detail}</span>
      </span>
      <span className="flex items-center gap-1.5 text-xs">
        <span className={cn('size-1.5 rounded-full', DOT[health])} />
        {WORD[health]}
      </span>
    </div>
  )
}
