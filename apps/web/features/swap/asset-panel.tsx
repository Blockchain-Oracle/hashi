'use client'

import { ArrowDown01Icon, Wallet01Icon } from '@hugeicons/core-free-icons'
import NumberFlow from '@number-flow/react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain } from '@/components/kit/logos'
import { Skeleton } from '@/components/ui/skeleton'
import type { BchAssetId, StableSymbol } from '@/lib/constants/assets'
import type { ChainId } from '@/lib/constants/chains'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface PanelAsset {
  symbol: StableSymbol | BchAssetId
  chain: ChainId
  /** "on Base", "ParyonUSD on Bitcoin Cash". */
  caption: string
}

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 2 } as const

/** The token button: the asset with its chain badged on, the symbol, a chevron. */
function TokenButton({ asset, onPick }: { asset: PanelAsset; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Choose a token (now ${asset.symbol} ${asset.caption})`}
      className="flex shrink-0 items-center gap-2 rounded-full bg-card py-1.5 pr-3 pl-1.5 font-medium shadow-card ring-1 ring-border transition-[background-color,transform] hover:bg-background active:scale-[0.97]"
    >
      <AssetOnChain asset={asset.symbol} chain={asset.chain} size={30} />
      <span className="text-[1.0625rem]">{asset.symbol}</span>
      <Icon icon={ArrowDown01Icon} className="text-muted-foreground" />
    </button>
  )
}

/** "You pay": a large mono amount the person types, the token button, its dollar value, balance and Max. */
export function PayPanel({
  label,
  asset,
  amount,
  onAmount,
  onPick,
  usd,
  balance,
  decimals,
  onMax,
  presets,
}: {
  label: string
  asset: PanelAsset
  amount: string
  onAmount: (value: string) => void
  onPick: () => void
  usd: number | undefined
  balance: bigint | undefined
  decimals: number
  onMax: (() => void) | undefined
  presets: string[]
}) {
  return (
    <div className="rounded-[1.6rem] bg-muted p-4 transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--ring)]">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="pay-amount" className="label-mono">
          {label}
        </label>
        {balance !== undefined ? (
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Icon icon={Wallet01Icon} />
            <span className="font-mono">{formatAmount(balance, decimals, decimals > 2 ? 4 : 2)}</span>
            {onMax ? (
              <button
                type="button"
                onClick={onMax}
                className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Max
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input
          id="pay-amount"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          className="w-full min-w-0 bg-transparent text-[2.75rem] text-amount outline-none placeholder:text-muted-foreground/50"
        />
        <TokenButton asset={asset} onPick={onPick} />
      </div>
      <div className="mt-1 flex min-h-6 items-center justify-between gap-3 text-muted-foreground text-sm">
        {amount && usd !== undefined ? (
          <NumberFlow locales="en-US" value={usd} format={USD} className="font-mono text-sm" />
        ) : amount ? (
          <span className="font-mono">—</span>
        ) : (
          <span className="flex gap-1.5">
            {presets.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onAmount(value)}
                className="rounded-full bg-card px-2.5 py-0.5 font-mono text-foreground text-xs shadow-card ring-1 ring-border transition-colors hover:bg-background"
              >
                {value}
              </button>
            ))}
          </span>
        )}
        <span className="truncate">{asset.caption}</span>
      </div>
    </div>
  )
}

/** "You receive": the selected route's amount after every fee, rolling as quotes refresh. */
export function ReceivePanel({
  label,
  asset,
  onPick,
  amount,
  decimals,
  fraction,
  usd,
  loading,
  updating,
  destination,
}: {
  label: string
  asset: PanelAsset
  onPick: () => void
  amount: bigint | undefined
  decimals: number
  fraction: number
  usd: number | undefined
  loading: boolean
  updating: boolean
  destination: ReactNode
}) {
  const value = amount === undefined ? undefined : Number(amount) / 10 ** decimals
  return (
    <div className="rounded-[1.6rem] bg-muted p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="label-mono">{label}</span>
        {destination}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className={cn('min-w-0 flex-1 transition-opacity', updating && 'opacity-55')} aria-live="polite">
          {value !== undefined ? (
            <NumberFlow
              locales="en-US"
              value={value}
              format={{ maximumFractionDigits: fraction, minimumFractionDigits: Math.min(2, fraction) }}
              className="block truncate text-[2.75rem] text-amount leading-[1.2]"
            />
          ) : loading ? (
            <Skeleton className="my-2 h-10 w-44 rounded-xl" />
          ) : (
            <span className="block text-[2.75rem] text-amount text-muted-foreground/50 leading-[1.2]">0</span>
          )}
        </div>
        <TokenButton asset={asset} onPick={onPick} />
      </div>
      <div className="mt-1 flex min-h-6 items-center justify-between gap-3 text-muted-foreground text-sm">
        {usd !== undefined ? (
          <NumberFlow locales="en-US" value={usd} format={USD} className="font-mono text-sm" />
        ) : (
          <span />
        )}
        <span className="truncate">{asset.caption}</span>
      </div>
    </div>
  )
}
