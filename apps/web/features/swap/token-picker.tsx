'use client'

import { Search01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { memo, useMemo, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain, ChainLogo } from '@/components/kit/logos'
import { Dialog, DialogPopup, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AssetKey, Balances } from '@/features/wallets/use-balances'
import { BCH_ASSETS, type BchAssetId, STABLES, type StableSymbol } from '@/lib/constants/assets'
import { CHAINS, type ChainId, EXTERNAL_CHAIN_IDS } from '@/lib/constants/chains'
import type { UsdPrices } from '@/lib/engine/costs'
import { formatAmount, formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { type PickedAsset, type Side, stableId } from './state'

interface Item {
  key: AssetKey
  asset: PickedAsset
  symbol: StableSymbol | BchAssetId
  chain: ChainId
  name: string
  decimals: number
}

const STABLE_NAME: Record<StableSymbol, string> = { USDC: 'USD Coin', USDT: 'Tether USD' }

const ITEMS: Item[] = [
  ...(['PUSD', 'MUSD', 'BCH'] as const).map((id) => ({
    key: id,
    asset: { kind: 'bch', id } as const,
    symbol: id,
    chain: 'bch' as const,
    name: BCH_ASSETS[id].name,
    decimals: BCH_ASSETS[id].decimals,
  })),
  ...STABLES.map((s) => ({
    key: stableId(s),
    asset: { kind: 'stable', stable: s } as const,
    symbol: s.symbol,
    chain: s.chain,
    name: STABLE_NAME[s.symbol],
    decimals: s.decimals,
  })),
]

const QUICK_PICKS = ['USDC.base', 'USDC.ethereum', 'USDT.ethereum', 'USDC.solana', 'PUSD', 'MUSD']
const FILTERS: ChainId[] = ['bch', ...EXTERNAL_CHAIN_IDS]

/** Live dollar value for USDC, USDT and BCH. PUSD and MUSD get none here: their price comes from a Cauldron quote. */
function itemUsd(item: Item, balance: bigint | undefined, prices: UsdPrices | undefined) {
  const price = prices?.[item.symbol]
  return balance && price !== undefined ? (Number(balance) / 10 ** item.decimals) * price : undefined
}

/** Order only, never shown: dollar tokens sort by face value when no live price is at hand. */
function sortValue(item: Item, balance: bigint | undefined, usd: number | undefined) {
  return usd ?? (balance ? Number(balance) / 10 ** item.decimals : 0)
}

/**
 * Pick a token: search by name, symbol or chain, filter by chain, quick picks, and
 * the connected wallets' balances, largest first. Every asset is listed on both sides and the pick always stays
 * put; the footer says up front what happens to the other side when it has to change (a stablecoin on both sides).
 */
export const TokenPicker = memo(function TokenPicker({
  open,
  onOpenChange,
  side,
  currentKey,
  other,
  fallback,
  onPick,
  balances,
  prices,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: Side
  currentKey: AssetKey
  /** What is on the other side, and the Bitcoin Cash asset that replaces it if a stablecoin is picked against one. */
  other: PickedAsset
  fallback: BchAssetId
  onPick: (asset: PickedAsset) => void
  balances: Balances
  prices: UsdPrices | undefined
}) {
  const [query, setQuery] = useState('')
  const [chain, setChain] = useState<ChainId | null>(null)
  const currentKind = ITEMS.find((i) => i.key === currentKey)?.asset.kind ?? 'stable'

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return ITEMS.filter((item) => {
      if (chain && item.chain !== chain) return false
      const text = `${item.symbol} ${item.name} ${CHAINS[item.chain].name}`.toLowerCase()
      return words.every((w) => text.includes(w))
    })
      .map((item, order) => {
        const balance = balances.assets.get(item.key)
        const usd = itemUsd(item, balance, prices)
        return { item, order, balance, usd, rank: sortValue(item, balance, usd) }
      })
      .sort(
        (a, b) =>
          // The side's own group first (stablecoins when paying into Bitcoin Cash), then what the wallets hold.
          Number(b.item.asset.kind === currentKind) - Number(a.item.asset.kind === currentKind) ||
          b.rank - a.rank ||
          a.order - b.order,
      )
  }, [query, chain, balances, prices, currentKind])

  const pick = (item: Item) => {
    onPick(item.asset)
    onOpenChange(false)
    setQuery('')
    setChain(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        className="max-h-[min(42rem,88dvh)] max-sm:rounded-t-[1.75rem] sm:max-w-[28rem] sm:rounded-[1.75rem]"
        bottomStickOnMobile
      >
        <div className="flex flex-col gap-4 px-5 pt-6 pb-3">
          <DialogTitle className="font-medium text-xl tracking-[-0.03em]">
            {side === 'pay' ? 'Pay with' : 'Receive'}
          </DialogTitle>
          <label className="flex h-12 items-center gap-2.5 rounded-2xl bg-muted px-4 focus-within:shadow-[inset_0_0_0_1.5px_var(--ring)]">
            <Icon icon={Search01Icon} className="text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                const first = results[0]
                if (e.key === 'Enter' && first) pick(first.item)
              }}
              placeholder="Search a token or chain"
              aria-label="Search a token or chain"
              className="w-full bg-transparent text-[0.9375rem] outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setChain(null)}
              className={cn(
                'h-9 shrink-0 rounded-full px-3.5 font-medium text-sm transition-colors',
                chain === null ? 'bg-foreground text-background' : 'bg-muted hover:bg-accent',
              )}
            >
              All
            </button>
            {FILTERS.map((id) => (
              <button
                key={id}
                type="button"
                title={CHAINS[id].name}
                aria-label={`Only ${CHAINS[id].name}`}
                aria-pressed={chain === id}
                onClick={() => setChain(chain === id ? null : id)}
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow]',
                  chain === id
                    ? 'bg-card shadow-[inset_0_0_0_2px_var(--foreground)]'
                    : 'bg-muted hover:bg-accent',
                )}
              >
                <ChainLogo chain={id} size={22} />
              </button>
            ))}
          </div>

          {!query && !chain ? (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PICKS.map((key) => {
                const item = ITEMS.find((i) => i.key === key)
                if (!item) return null
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pick(item)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-sm ring-1 ring-border transition-colors hover:bg-muted',
                      key === currentKey && 'bg-muted',
                    )}
                  >
                    <AssetOnChain asset={item.symbol} chain={item.chain} size={22} />
                    <span className="font-medium">{item.symbol}</span>
                    <span className="text-muted-foreground">{CHAINS[item.chain].name}</span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <ScrollArea className="min-h-0 flex-1 border-border border-t">
          <ul className="flex flex-col p-2">
            {results.length === 0 ? (
              <li className="px-3 py-10 text-center text-muted-foreground text-sm">
                No token by that name. Hashi moves USDC and USDT, PUSD, MUSD and BCH.
              </li>
            ) : null}
            {results.map(({ item, balance, usd }) => {
              const current = item.key === currentKey
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    aria-current={current}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted',
                      current && 'bg-muted',
                    )}
                  >
                    <AssetOnChain asset={item.symbol} chain={item.chain} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        {item.symbol}
                        {current ? <Icon icon={Tick02Icon} className="text-primary" /> : null}
                      </span>
                      <span className="block truncate text-muted-foreground text-sm">
                        {item.symbol === 'BCH'
                          ? 'The Bitcoin Cash coin'
                          : `${item.name} · ${CHAINS[item.chain].name}`}
                      </span>
                    </span>
                    {balance ? (
                      <span className="text-right">
                        <span className="block font-mono text-sm">
                          {formatAmount(balance, item.decimals, item.decimals > 2 ? 4 : 2)}
                        </span>
                        {usd !== undefined ? (
                          <span className="block font-mono text-muted-foreground text-xs">
                            {formatUsd(usd)}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
        <p className="border-border border-t px-5 py-3 text-muted-foreground text-xs leading-relaxed">
          {other.kind === 'stable'
            ? `The other side is a stablecoin too, and stablecoin to stablecoin is not a Hashi route: pick one here and the other side becomes ${fallback}.`
            : 'PUSD, MUSD and BCH swap with each other on Cauldron, and with USDC and USDT on eight chains through a bridge.'}
        </p>
      </DialogPopup>
    </Dialog>
  )
})
