'use client'

import type { ReactNode } from 'react'
import { BrandLogo, ChainLogo } from '@/components/kit/logos'
import { StatusPill } from '@/components/kit/status-pill'
import { THOR_CHAINS, useProviderHealth } from '@/features/routes/use-provider-health'
import { BCH_ASSETS } from '@/lib/constants/assets'
import { formatAmount, formatUsd } from '@/lib/format'

/** Live health of every service Hashi depends on, each checked on its own. */
export function ProviderStatus() {
  const { near, thor, router, electrum, halted } = useProviderHealth()
  const bchUsd = near.data?.find((t) => t.assetId === 'nep141:bch.omft.near')?.price

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        logo={<BrandLogo brand="near" size={28} />}
        name="NEAR Intents"
        state={near.isError ? 'down' : near.data ? 'up' : 'checking'}
        detail={
          near.data ? (
            <>
              {near.data.length} tokens · BCH {bchUsd ? formatUsd(bchUsd) : '—'}
            </>
          ) : (
            near.error?.message
          )
        }
      />
      <Tile
        logo={<BrandLogo brand="thorchain" size={28} />}
        name="THORChain"
        state={thor.isError ? 'down' : !thor.data ? 'checking' : halted?.length ? 'partial' : 'up'}
        detail={
          thor.data
            ? halted?.length
              ? `Paused: ${halted.join(', ')}`
              : `${THOR_CHAINS.join(', ')} open`
            : thor.error?.message
        }
      />
      <Tile
        logo={<BrandLogo brand="cauldron" size={28} />}
        name="Cauldron Router"
        state={router.isError ? 'down' : router.data ? 'up' : 'checking'}
        detail={
          router.data ? (
            <>
              1 PUSD = {formatAmount(router.data.sats, BCH_ASSETS.BCH.decimals, 8)} BCH
              {bchUsd ? ` ≈ ${formatUsd((Number(router.data.sats) / 1e8) * bchUsd)}` : ''} · {router.data.ms}{' '}
              ms
            </>
          ) : (
            router.error?.message
          )
        }
      />
      <Tile
        logo={<ChainLogo chain="bch" size={28} />}
        name="Electrum"
        state={electrum.isError ? 'down' : electrum.data ? 'up' : 'checking'}
        detail={
          electrum.data
            ? `Block ${electrum.data.height.toLocaleString('en-US')} · ${electrum.data.host ?? ''}`
            : electrum.error?.message
        }
      />
    </div>
  )
}

function Tile({
  logo,
  name,
  state,
  detail,
}: {
  logo: ReactNode
  name: string
  state: 'up' | 'partial' | 'down' | 'checking'
  detail: ReactNode
}) {
  const pill = {
    up: <StatusPill tone="success">Live</StatusPill>,
    partial: <StatusPill tone="warning">Partly paused</StatusPill>,
    down: <StatusPill tone="error">Down</StatusPill>,
    checking: <StatusPill tone="ink">Checking</StatusPill>,
  }[state]
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        {logo}
        <span className="font-medium">{name}</span>
        <span className="ml-auto scale-90">{pill}</span>
      </div>
      <p className="min-h-10 font-mono text-muted-foreground text-xs leading-relaxed">{detail ?? ' '}</p>
    </div>
  )
}
