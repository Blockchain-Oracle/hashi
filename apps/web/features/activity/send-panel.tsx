'use client'

import { Alert02Icon, Clock01Icon } from '@hugeicons/core-free-icons'
import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { BrandQr } from '@/components/kit/brand-qr'
import { CopyButton } from '@/components/kit/copy-button'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain } from '@/components/kit/logos'
import { Spinner } from '@/components/ui/spinner'
import { STABLES } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import { quoteDeadline } from '@/lib/engine/expiry'
import type { SwapRecord } from '@/lib/engine/swap'
import { formatAmount, shortAddress } from '@/lib/format'
import { paymentLink } from '@/lib/pay-link'
import { cn } from '@/lib/utils'

function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * A swap the person pays themselves: where to send, how much, on which network, and how long the address takes it.
 * The QR is a payment request (the coin, network and amount filled in) for a phone wallet; an exchange takes the
 * address and amount pasted. Hashi watches NEAR for the deposit and moves on by itself.
 */
export function SendPanel({ record }: { record: SwapRecord }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

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
  const shown = formatAmount(amount, stable.decimals, stable.decimals)
  // NEAR keeps a flexible quote's address open for days, but the price was set for the hour Hashi asked for: that
  // hour is the time to send. Past it a deposit is still watched for, though it may come back as a refund.
  const asked = Date.parse(bridge?.quoteRequest?.deadline ?? '')
  const sendBy = Number.isFinite(asked) ? asked : quoteDeadline(record)
  const late = sendBy !== undefined && now >= sendBy
  const link = paymentLink(stable, to, amount)

  return (
    <div className="flex flex-col gap-5 rounded-[1.75rem] bg-card p-5 shadow-card ring-1 ring-border sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <AssetOnChain asset={stable.symbol} chain={stable.chain} size={40} />
          <div className="flex flex-col">
            <span className="font-medium text-[1.375rem] leading-tight tracking-[-0.02em]">
              Send <span className="font-mono tabular-nums">{shown}</span> {stable.symbol}
            </span>
            <span className="font-medium text-primary text-sm">On {chain.name} only</span>
          </div>
        </div>
        {sendBy ? (
          <span
            title="Time to send at this price"
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs tabular-nums',
              late ? 'bg-destructive/15 text-destructive' : 'bg-muted',
            )}
          >
            <Icon icon={Clock01Icon} size={14} className={late ? '' : 'text-muted-foreground'} />
            {late ? 'Time is up' : left(sendBy - now)}
          </span>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <dl className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <dt className="label-mono">To this address</dt>
            <dd className="flex items-start gap-1 rounded-2xl bg-muted py-2.5 pr-1.5 pl-3">
              <span className="min-w-0 flex-1 break-all font-mono text-sm leading-relaxed">{to}</span>
              <CopyButton value={to} label="Copy the deposit address" className="size-8 shrink-0" />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="label-mono">Amount</dt>
            <dd className="flex items-center gap-1 rounded-2xl bg-muted py-1.5 pr-1.5 pl-3">
              <span className="flex-1 font-mono text-sm tabular-nums">
                {formatUnits(amount, stable.decimals)} {stable.symbol}
              </span>
              <CopyButton
                value={formatUnits(amount, stable.decimals)}
                label="Copy the amount"
                className="size-8 shrink-0"
              />
            </dd>
          </div>
        </dl>
        <figure className="flex flex-col items-center gap-2">
          <div className="rounded-3xl bg-white p-2 shadow-card ring-1 ring-black/5">
            <BrandQr
              value={link}
              size={176}
              label={`Payment request: ${shown} ${stable.symbol} on ${chain.name}`}
            />
          </div>
          <figcaption className="max-w-[12rem] text-center text-muted-foreground text-xs leading-snug">
            Scan with a phone wallet: coin, network and amount filled in
          </figcaption>
        </figure>
      </div>

      {late ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-destructive text-sm leading-relaxed">
          The hour for this price is over. If you haven&apos;t sent yet, start a new swap: a late deposit may
          come back as a refund.
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5 text-sm">
        <li className="flex gap-2 text-foreground/80">
          <Icon icon={Alert02Icon} size={16} className="mt-0.5 shrink-0 text-(--warning)" />
          Only {stable.symbol} on {chain.name}. Another coin or network won&apos;t reach this swap.
        </li>
        <li className="pl-6 text-muted-foreground">
          Anything from {formatAmount(least, stable.decimals, stable.decimals)} {stable.symbol} up is swapped
          (an exchange&apos;s fee is fine).
        </li>
        <li className="pl-6 text-muted-foreground">
          If it can&apos;t go through, it comes back to{' '}
          {shortAddress(record.addresses.stableSide ?? '', 6, 4)}.
        </li>
      </ul>

      <div className="flex items-center gap-2.5 rounded-2xl bg-primary/8 px-4 py-3 text-sm">
        <Spinner className="size-4 text-primary" />
        Watching for your {stable.symbol}. This page moves on by itself when it lands.
      </div>
    </div>
  )
}
