'use client'

import { ArrowDataTransferVerticalIcon } from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'
import { parseUnits } from 'viem'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, AssetOnChain } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { BCH_ASSETS, type BchAssetId, STABLES } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import { DEFAULT_SLIPPAGE_BPS } from '@/lib/constants/limits'
import { rankRoutes } from '@/lib/engine/rank'
import type { BridgeDirection, BridgePair, QuoteRequest, RouteOutcome } from '@/lib/engine/types'
import { cn } from '@/lib/utils'
import { useDebounced, useRouteQuote } from '../routes/use-route-quotes'
import { RouteCard } from './route-card'

const BCH_SIDE: BchAssetId[] = ['PUSD', 'MUSD', 'BCH']

function toBase(text: string, decimals: number): bigint {
  try {
    return text ? parseUnits(text, decimals) : 0n
  } catch {
    return 0n
  }
}

/** Every live route for one pair and amount, priced end to end by the real engine. Prices only; nothing moves. */
export function RouteBench() {
  const [direction, setDirection] = useState<BridgeDirection>('in')
  const [stableIndex, setStableIndex] = useState(0)
  const [bchAsset, setBchAsset] = useState<BchAssetId>('PUSD')
  const [text, setText] = useState('10')
  const debounced = useDebounced(text)

  const stable = STABLES[stableIndex] ?? STABLES[0]
  const payDecimals = direction === 'in' ? (stable?.decimals ?? 6) : BCH_ASSETS[bchAsset].decimals
  const amount = toBase(debounced, payDecimals)

  // The bench prices bridged pairs only; swaps that stay on Bitcoin Cash are priced on /swap.
  const req = useMemo<QuoteRequest<BridgePair> | null>(
    () =>
      stable ? { pair: { direction, stable, bchAsset }, amount, slippageBps: DEFAULT_SLIPPAGE_BPS } : null,
    [direction, stable, bchAsset, amount],
  )
  const near = useRouteQuote('near', req)
  const thor = useRouteQuote('thorchain', req)
  const ranked = rankRoutes([near.data, thor.data].filter((o): o is RouteOutcome => Boolean(o)))

  if (!stable || !req) return null
  const paySymbol = direction === 'in' ? stable.symbol : bchAsset

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 shadow-card">
        <div>
          <p className="label-mono">Direction</p>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {(['in', 'out'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={cn(
                  'rounded-xl py-2 font-medium text-sm transition-colors',
                  direction === d ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {d === 'in' ? 'Into Bitcoin Cash' : 'Out of Bitcoin Cash'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label-mono">{direction === 'in' ? 'Pay with' : 'Receive'}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {STABLES.map((s, i) => (
              <button
                key={`${s.symbol}-${s.chain}`}
                type="button"
                onClick={() => setStableIndex(i)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-colors',
                  i === stableIndex ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <AssetOnChain asset={s.symbol} chain={s.chain} size={22} />
                <span className="truncate">
                  {s.symbol} <span className="text-muted-foreground">{CHAINS[s.chain].name}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center text-muted-foreground">
          <Icon icon={ArrowDataTransferVerticalIcon} size={20} />
        </div>

        <div>
          <p className="label-mono">
            {direction === 'in' ? 'Receive on Bitcoin Cash' : 'Pay from Bitcoin Cash'}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {BCH_SIDE.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setBchAsset(a)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border py-2 font-medium text-sm transition-colors',
                  a === bchAsset ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted',
                )}
              >
                <AssetLogo asset={a} size={20} />
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label-mono">Amount ({paySymbol})</p>
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
            aria-label={`Amount in ${paySymbol}`}
            className="mt-2 w-full rounded-2xl bg-muted px-4 py-3 text-3xl text-amount outline-none focus:ring-4 focus:ring-ring"
          />
          <div className="mt-2 flex gap-1.5">
            {(direction === 'in'
              ? ['1', '10', '100']
              : bchAsset === 'BCH'
                ? ['0.005', '0.05', '0.5']
                : ['1', '10', '100']
            ).map((v) => (
              <Button key={v} variant="soft" size="xs" onClick={() => setText(v)}>
                {v}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid content-start gap-4 md:grid-cols-2">
        <RouteCard
          provider="near"
          req={req}
          query={near}
          best={ranked.bestReturn === 'near'}
          fastest={ranked.fastest === 'near'}
        />
        <RouteCard
          provider="thorchain"
          req={req}
          query={thor}
          best={ranked.bestReturn === 'thorchain'}
          fastest={ranked.fastest === 'thorchain'}
        />
      </div>
    </div>
  )
}
