'use client'

import {
  Alert02Icon,
  ArrowTurnBackwardIcon,
  Clock01Icon,
  Copy01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { BrandQr } from '@/components/kit/brand-qr'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain, ChainLogo } from '@/components/kit/logos'
import { STABLES } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import { quoteDeadline } from '@/lib/engine/expiry'
import type { SwapRecord } from '@/lib/engine/swap'
import { shortAddress } from '@/lib/format'
import { paymentLink } from '@/lib/pay-link'
import { cn } from '@/lib/utils'

const COPIED_MS = 1600

function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * An address as groups of four, in two even rows: easy to compare against what an exchange shows, and never broken
 * mid-group on a narrow screen. `0x` stays with its first group.
 */
function addressRows(address: string): string[][] {
  const hex = address.startsWith('0x')
  const groups = (hex ? address.slice(2) : address).match(/.{1,4}/g) ?? [address]
  if (hex) groups[0] = `0x${groups[0]}`
  const half = Math.ceil(groups.length / 2)
  return [groups.slice(0, half), groups.slice(half)]
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(null), COPIED_MS)
    return () => clearTimeout(id)
  }, [copied])
  const copy = (what: string, value: string) => {
    void navigator.clipboard.writeText(value).then(() => setCopied(what))
  }
  return { copied, copy }
}

/**
 * A swap the person pays themselves, laid out like a receive screen: the network, the amount, the QR (a payment
 * request with the coin, network and amount filled in), the address to check and copy, and three short facts.
 * Hashi watches NEAR for the deposit and moves on by itself.
 */
export function SendPanel({ record }: { record: SwapRecord }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const { copied, copy } = useCopy()

  const stable = STABLES.find((s) => s.chain === record.stable?.chain && s.symbol === record.stable?.symbol)
  const bridge = record.bridgeQuote as
    | { quote?: { amountIn?: string; minAmountIn?: string }; quoteRequest?: { deadline?: string } }
    | undefined
  const quote = bridge?.quote
  const to = record.depositAddress
  if (!stable || !to || !quote?.amountIn) return null
  const chain = CHAINS[stable.chain]
  const amount = BigInt(quote.amountIn)
  const least = quote.minAmountIn ? BigInt(quote.minAmountIn) : amount
  const exact = formatUnits(amount, stable.decimals)
  const shown = Number(exact).toFixed(2)
  // NEAR keeps a flexible quote's address open for days, but the price was set for the hour Hashi asked for: that
  // hour is the time to send. Past it a deposit is still watched for, though it may come back as a refund.
  const asked = Date.parse(bridge?.quoteRequest?.deadline ?? '')
  const sendBy = Number.isFinite(asked) ? asked : quoteDeadline(record)
  const late = sendBy !== undefined && now >= sendBy
  const rows = addressRows(to)
  const lastRow = rows.length - 1

  return (
    <div className="flex flex-col items-center gap-5 rounded-[1.75rem] bg-card px-5 pt-5 pb-4 shadow-card ring-1 ring-border sm:px-8 sm:pt-6">
      <div className="flex w-full items-center justify-between">
        <span className="flex items-center gap-2 rounded-full bg-muted py-1 pr-3 pl-1 font-medium text-sm">
          <ChainLogo chain={stable.chain} size={22} />
          {chain.name}
        </span>
        {sendBy ? (
          <span
            title="Time to send at this price"
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm tabular-nums',
              late ? 'bg-destructive/12 text-destructive' : 'bg-muted',
            )}
          >
            <Icon icon={Clock01Icon} size={15} className={late ? '' : 'text-muted-foreground'} />
            {late ? 'Time is up' : left(sendBy - now)}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <AssetOnChain asset={stable.symbol} chain={stable.chain} size={36} />
        <span className="font-medium font-mono text-[2.5rem] leading-none tracking-[-0.04em] tabular-nums">
          {shown}
        </span>
        <span className="self-end pb-1 font-medium text-lg text-muted-foreground">{stable.symbol}</span>
      </div>

      <div className="rounded-[1.75rem] bg-white p-3 shadow-card ring-1 ring-black/5">
        <BrandQr
          value={paymentLink(stable, to, amount)}
          size={208}
          label={`Pay ${shown} ${stable.symbol} on ${chain.name}`}
        />
      </div>

      <button
        type="button"
        onClick={() => copy('address', to)}
        aria-label={`Deposit address ${to}. Copy it`}
        className="flex w-full max-w-[26rem] flex-col items-center gap-1 rounded-2xl px-4 py-3 font-mono text-[0.9375rem] tracking-[0.02em] transition-colors hover:bg-muted"
      >
        {rows.map((row, r) => (
          <span key={row.join('')} className="flex gap-2.5">
            {row.map((group, g) => (
              <span
                key={group + String(g)}
                className={cn(
                  (r === 0 && g === 0) || (r === lastRow && g === row.length - 1)
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {group}
              </span>
            ))}
          </span>
        ))}
      </button>

      <div className="grid w-full max-w-[26rem] grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={() => copy('address', to)}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-foreground font-medium text-background transition-opacity hover:opacity-90"
        >
          <Icon icon={copied === 'address' ? Tick02Icon : Copy01Icon} size={18} />
          {copied === 'address' ? 'Copied' : 'Copy address'}
        </button>
        <button
          type="button"
          onClick={() => copy('amount', exact)}
          aria-label={`Copy the amount, ${exact}`}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-muted px-4 font-medium font-mono text-sm tabular-nums transition-colors hover:bg-muted/70"
        >
          <Icon icon={copied === 'amount' ? Tick02Icon : Copy01Icon} size={16} />
          {copied === 'amount' ? 'Copied' : shown}
        </button>
      </div>

      <ul className="flex flex-wrap justify-center gap-1.5 text-[0.8125rem]">
        <li className="flex items-center gap-1.5 rounded-full bg-(--warning)/12 px-2.5 py-1 font-medium text-foreground">
          <Icon icon={Alert02Icon} size={14} className="text-(--warning)" />
          {chain.name} only
        </li>
        <li className="rounded-full bg-muted px-2.5 py-1 text-foreground/75">
          Min <span className="font-mono">{Number(formatUnits(least, stable.decimals)).toFixed(2)}</span>
        </li>
        <li className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-foreground/75">
          <Icon icon={ArrowTurnBackwardIcon} size={14} />
          Refund <span className="font-mono">{shortAddress(record.addresses.stableSide ?? '', 4, 4)}</span>
        </li>
      </ul>

      <div
        className={cn(
          'flex w-full items-center justify-center gap-2 border-border border-t pt-4 text-sm',
          late ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {late ? (
          'Price expired. Start a new swap instead of sending.'
        ) : (
          <>
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Watching for your {stable.symbol}
          </>
        )}
      </div>
    </div>
  )
}
