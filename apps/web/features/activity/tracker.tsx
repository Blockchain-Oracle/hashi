'use client'

import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CopyButton } from '@/components/kit/copy-button'
import { Glow } from '@/components/kit/glow'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain, BrandLogo } from '@/components/kit/logos'
import { type PillTone, StatusPill } from '@/components/kit/status-pill'
import { StepTimeline } from '@/components/kit/step-timeline'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useBchWallet } from '@/features/wallets/bch-wallet'
import { useEvmWallet } from '@/features/wallets/evm-wallet'
import { CHAINS } from '@/lib/constants/chains'
import { STATUS_TROUBLE_MS } from '@/lib/constants/limits'
import { tradesOnArrival } from '@/lib/engine/arrival-terms'
import type { SwapRecord, SwapStatus } from '@/lib/engine/swap'
import { PROVIDERS } from '@/lib/engine/types'
import { displayDecimals, formatAmount, shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'
import { LiveProgressPanel } from './live-progress'
import { liveProgress, shortProgress } from './progress'
import { bridgeExplorerUrl, headline, paySide, receiveSide, secondsLeft, trackerSteps } from './steps'
import { useSwapRunner } from './use-swap-runner'

export const STATUS_PILL: Record<SwapStatus, { tone: PillTone; label: string }> = {
  quoted: { tone: 'ink', label: 'Waiting for deposit' },
  'deposit-sent': { tone: 'pending', label: 'Deposit sent' },
  bridging: { tone: 'pending', label: 'Bridging' },
  'bch-arrived': { tone: 'warning', label: 'One approval left' },
  swapping: { tone: 'pending', label: 'Swapping' },
  completed: { tone: 'success', label: 'Completed' },
  refunded: { tone: 'warning', label: 'Refunded' },
  failed: { tone: 'error', label: 'Failed' },
  expired: { tone: 'ink', label: 'Expired' },
}

/** The status pill for a swap: a swap contract trading by itself is "Swapping", not "One approval left". */
export function statusPill(record: SwapRecord): { tone: PillTone; label: string } {
  if (record.status === 'bch-arrived' && tradesOnArrival(record)) return STATUS_PILL.swapping
  return STATUS_PILL[record.status]
}

/** The route's carriers in the order the money meets them: "NEAR Intents → Cauldron", "Cauldron", "THORChain". */
export function routeName(record: SwapRecord): string {
  const bridge = PROVIDERS[record.provider].name
  if (record.direction === 'local' || record.provider === 'cauldron') return 'Cauldron'
  if (record.bchAsset === 'BCH') return bridge
  return record.direction === 'in' ? `${bridge} → Cauldron` : `Cauldron → ${bridge}`
}

/** Re-renders every second while something is counting down. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

/** "New swap" with the same pair, so a refund or a repeat is one click away. */
export function againHref(record: SwapRecord): Route {
  const stable = record.stable ? `${record.stable.symbol}.${record.stable.chain}` : undefined
  const params = new URLSearchParams(
    record.direction === 'local' || !stable
      ? { from: record.bchFrom ?? 'BCH', to: record.bchAsset }
      : record.direction === 'in'
        ? { from: stable, to: record.bchAsset }
        : { from: record.bchAsset, to: stable },
  )
  return `/swap?${params}` as Route
}

/**
 * The live tracker: one swap across both chains,
 * step by step, with explorer links, a countdown, and the one action the person can take next. It runs the swap
 * itself: deposit, status checks every 5 s, and the Cauldron finish.
 */
export function Tracker({ id }: { id: string }) {
  const runner = useSwapRunner(id)
  const { record } = runner
  const waiting = record?.status === 'deposit-sent' || record?.status === 'bridging'
  const now = useNow(Boolean(waiting))

  if (runner.loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 pt-12">
        <Skeleton className="h-48 rounded-[2rem]" />
        <Skeleton className="h-72 rounded-[2rem]" />
      </div>
    )
  }
  if (!record) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-24 text-center">
        <h1 className="text-title">No swap here</h1>
        <p className="text-muted-foreground">
          Swaps are saved in the browser that started them. This one is not in this browser.
        </p>
        <Button render={<Link href="/activity" />} nativeButton={false} variant="secondary">
          See your activity
        </Button>
      </div>
    )
  }

  const pay = paySide(record)
  const receive = receiveSide(record)
  const pill = statusPill(record)
  const title = headline(record)
  // While a bridge carries the swap: what it waits for now, read live from the chain and the bridge.
  const progress = liveProgress(record, runner.bridgeReading, runner.chainReading)
  const steps = trackerSteps(record, now, progress ? shortProgress(progress, now) : undefined)
  const received = record.receivedAmount ?? record.quoted?.amountOut
  const left = secondsLeft(record, now)
  // Hashi cannot read the bridge's status: say that, rather than blame the bridge for being slow.
  const unreadable = runner.statusTrouble !== null && now - runner.statusTrouble.since >= STATUS_TROUBLE_MS
  // The live panel says what is slow and why; this is the fallback when nothing can be read.
  const slow =
    !progress && !unreadable && left !== undefined && record.quoted && left < -record.quoted.etaSeconds * 0.5
  const explorer = bridgeExplorerUrl(record)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pt-10 sm:pt-14">
      <Link
        href="/activity"
        className="flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        <Icon icon={ArrowLeft01Icon} />
        Activity
      </Link>

      <section className="relative">
        {record.status === 'completed' ? <Glow /> : null}
        <div className="relative flex flex-col gap-6 rounded-[2rem] border border-border bg-card p-6 shadow-float sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="label-mono flex items-center gap-2">
              <BrandLogo brand={record.provider} size={16} />
              {routeName(record)} · {new Date(record.createdAt).toLocaleString('en-GB')}
            </span>
            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-medium text-[2rem] leading-[1.05] tracking-[-0.04em] sm:text-[2.5rem]">
              {title.title}
            </h1>
            <p className="flex items-start gap-2 text-muted-foreground">
              <Icon icon={InformationCircleIcon} className="mt-1 shrink-0" />
              {title.close}
            </p>
          </div>

          {/* Side by side from a small tablet up; stacked on a phone, where two amounts would cut each other short. */}
          <div className="grid grid-cols-1 items-center gap-3 rounded-[1.6rem] bg-muted p-4 sm:grid-cols-[1fr_auto_1fr]">
            <Amount
              label="You paid"
              amount={formatAmount(BigInt(record.amountIn), pay.decimals, displayDecimals(pay.symbol))}
              symbol={pay.symbol}
              chain={pay.chain}
            />
            <Icon
              icon={ArrowRight02Icon}
              className="ml-2.5 rotate-90 text-muted-foreground sm:ml-0 sm:rotate-0"
            />
            <Amount
              label={record.receivedAmount ? 'You received' : 'You receive'}
              amount={
                received
                  ? `${record.receivedAmount ? '' : '≈ '}${formatAmount(BigInt(received), receive.decimals, displayDecimals(receive.symbol))}`
                  : '—'
              }
              symbol={receive.symbol}
              chain={receive.chain}
            />
          </div>

          {progress && !unreadable ? (
            <LiveProgressPanel progress={progress} record={record} now={now} />
          ) : (
            <Action runner={runner} record={record} />
          )}

          {record.arrival &&
          runner.contractSats > 0n &&
          !((record.status === 'bch-arrived' || record.status === 'swapping') && tradesOnArrival(record)) ? (
            // BCH at the contract outside the usual moment (a split payout, a late payout after a trade or a return,
            // or a bridge status that never came): it is the person's, and one click sends it to their wallet.
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted p-3 text-sm">
              <span className="flex-1">
                {formatAmount(runner.contractSats, 8, 8)} BCH is waiting in this swap's contract.
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={runner.releaseToWallet}
                disabled={runner.busy !== null}
              >
                Send it to my wallet
              </Button>
            </div>
          ) : null}
          {unreadable ? (
            <p className="flex items-start gap-2 rounded-2xl bg-(--warning)/10 p-3 text-sm">
              <Icon icon={Alert02Icon} className="mt-0.5 shrink-0 text-(--warning)" />
              <span>
                Hashi can't get a status from {PROVIDERS[record.provider].name} right now, so this page is
                waiting. The swap itself carries on without it, and Hashi keeps checking.{' '}
                {explorer ? (
                  <a
                    href={explorer}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-4"
                  >
                    Follow it on {PROVIDERS[record.provider].name} ↗
                  </a>
                ) : null}
              </span>
            </p>
          ) : null}
          {slow ? (
            <p className="flex items-start gap-2 rounded-2xl bg-(--warning)/10 p-3 text-sm">
              <Icon icon={Alert02Icon} className="mt-0.5 shrink-0 text-(--warning)" />
              {record.direction === 'out'
                ? 'Taking longer than usual. Bitcoin Cash blocks come every 10 minutes on average, but one can take 20 or more; the bridge starts after it.'
                : `Taking longer than usual. ${PROVIDERS[record.provider].name} waits for confirmations on ${record.stable ? CHAINS[record.stable.chain].name : 'the paying chain'}; if it cannot fill, it refunds the deposit on its own.`}
            </p>
          ) : null}
          {runner.error ? (
            <div
              className={cn(
                'flex flex-col gap-3 rounded-2xl p-3 text-sm',
                runner.offer ? 'bg-(--warning)/10' : 'bg-destructive/10 text-destructive',
              )}
            >
              <p className="flex items-start gap-2">
                <Icon
                  icon={Alert02Icon}
                  className={cn('mt-0.5 shrink-0', runner.offer ? 'text-(--warning)' : '')}
                />
                {runner.error}
              </p>
              {runner.offer ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                  onClick={runner.acceptNewPrice}
                  disabled={runner.busy !== null}
                >
                  Continue at the new price
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-card sm:p-8">
        <p className="label-mono mb-6">/ Across both chains</p>
        <StepTimeline steps={steps} />
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-card sm:p-8">
        <p className="label-mono mb-4">/ What happened</p>
        <ol className="flex flex-col gap-2.5">
          {[...record.events].reverse().map((event) => (
            <li
              key={`${event.at}-${event.status}`}
              className="flex items-baseline justify-between gap-4 text-sm"
            >
              <span>{event.note}</span>
              <span className="shrink-0 font-mono text-muted-foreground text-xs">
                {new Date(event.at).toLocaleTimeString('en-GB')}
              </span>
            </li>
          ))}
        </ol>
        <details className="mt-6 border-border border-t pt-4 text-sm">
          <summary className="cursor-pointer select-none text-muted-foreground">Details for support</summary>
          <dl className="mt-3 flex flex-col gap-2">
            {record.depositAddress ? <Detail term="Deposit address" value={record.depositAddress} /> : null}
            {record.memo ? <Detail term="THORChain memo" value={record.memo} /> : null}
            {fromAddress(record) ? (
              <Detail
                term={record.direction === 'local' ? 'From' : 'From / refund'}
                value={fromAddress(record) as string}
              />
            ) : null}
            {toAddress(record) ? <Detail term="To" value={toAddress(record) as string} /> : null}
            <Detail term="Swap id" value={record.id} />
            {nearCorrelation(record) ? (
              <Detail term="NEAR quote id" value={nearCorrelation(record) as string} />
            ) : null}
          </dl>
          {runner.log.length ? (
            <pre className="mt-4 max-h-56 overflow-auto rounded-2xl bg-muted p-3 font-mono text-[0.6875rem] leading-relaxed">
              {runner.log
                .map(
                  (l) =>
                    `${new Date(l.at).toISOString().slice(11, 19)} ${l.step.padEnd(8)} ${l.detail}${l.repeats > 1 ? ` (×${l.repeats})` : ''}`,
                )
                .join('\n')}
            </pre>
          ) : null}
        </details>
      </section>
    </div>
  )
}

function nearCorrelation(record: SwapRecord): string | undefined {
  const quote = record.bridgeQuote as { correlationId?: string } | undefined
  return record.provider === 'near' ? quote?.correlationId : undefined
}

function Amount({
  label,
  amount,
  symbol,
  chain,
}: {
  label: string
  amount: string
  symbol: Parameters<typeof AssetOnChain>[0]['asset']
  chain: keyof typeof CHAINS
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AssetOnChain asset={symbol} chain={chain} size={36} />
      <div className="min-w-0">
        <p className="label-mono">{label}</p>
        <p className="truncate text-amount text-xl sm:text-2xl">
          {amount} <span className="font-sans text-muted-foreground text-sm tracking-normal">{symbol}</span>
        </p>
      </div>
    </div>
  )
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="flex items-center gap-1 font-mono text-xs">
        <span title={value}>{shortAddress(value, 8, 6)}</span>
        <CopyButton value={value} label={`Copy ${term.toLowerCase()}`} className="size-6" />
      </dd>
    </div>
  )
}

/** Where the swap pays from: the stablecoin wallet going in, the Bitcoin Cash wallet otherwise (its token address for PUSD and MUSD). */
function fromAddress(record: SwapRecord): string | undefined {
  if (record.direction === 'in') return record.addresses.stableSide
  const paid = record.direction === 'local' ? record.bchFrom : record.bchAsset
  return paid === 'BCH' ? record.addresses.bchPlain : record.addresses.bchToken
}

function toAddress(record: SwapRecord): string | undefined {
  if (record.direction === 'out') return record.addresses.stableSide
  return record.bchAsset === 'BCH' ? record.addresses.bchPlain : record.addresses.bchToken
}

/** The one thing the person can do now, if anything. */
function Action({ runner, record }: { runner: ReturnType<typeof useSwapRunner>; record: SwapRecord }) {
  const evm = useEvmWallet()
  const { openConnect } = useBchWallet()
  const chain = record.stable ? CHAINS[record.stable.chain] : CHAINS.bch

  if (record.status === 'quoted') {
    const needsBch = record.direction !== 'in'
    const what =
      record.direction === 'local'
        ? 'the swap'
        : record.direction === 'out' && record.bchAsset !== 'BCH' && !record.cauldronTxid
          ? `the sale of ${record.bchAsset}`
          : 'the deposit'
    const connected = needsBch ? runner.bchConnected : runner.stableConnected
    if (!connected) {
      return (
        <Button
          size="xl"
          variant="secondary"
          onClick={() =>
            needsBch ? openConnect() : evm.connect(chain.kind === 'solana' ? 'solana' : 'eip155')
          }
        >
          <Icon icon={Wallet01Icon} />
          Connect your {needsBch ? 'Bitcoin Cash' : chain.name} wallet
          <span className="hidden sm:inline">to continue</span>
        </Button>
      )
    }
    return (
      <Button size="xl" onClick={runner.deposit} disabled={runner.busy !== null}>
        {runner.busy ? <Spinner className="size-4" /> : null}
        {runner.busy
          ? 'Waiting for your wallet…'
          : `Approve ${what} in your ${needsBch ? 'Bitcoin Cash' : chain.name} wallet`}
      </Button>
    )
  }
  if ((record.status === 'bch-arrived' || record.status === 'swapping') && tradesOnArrival(record)) {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <Spinner className="size-4" />
          {runner.arrivalWait?.message ?? `Turning the BCH into ${record.bchAsset}, with no approval needed…`}
        </p>
        {runner.contractSats > 0n ? (
          <Button
            variant="secondary"
            onClick={runner.releaseToWallet}
            disabled={runner.busy !== null}
            className="w-fit"
          >
            {runner.busy ? <Spinner className="size-4" /> : null}
            Send the BCH to my wallet instead
          </Button>
        ) : null}
      </div>
    )
  }
  if (record.status === 'bch-arrived' || record.status === 'swapping') {
    if (!runner.bchConnected) {
      return (
        <Button size="xl" variant="secondary" onClick={openConnect}>
          <Icon icon={Wallet01Icon} />
          Connect your Bitcoin Cash wallet
          <span className="hidden sm:inline">to finish</span>
        </Button>
      )
    }
    return (
      <Button size="xl" onClick={runner.finish} disabled={runner.busy !== null}>
        {runner.busy ? <Spinner className="size-4" /> : null}
        {runner.busy ? 'Waiting for your wallet…' : `Swap the BCH into ${record.bchAsset}`}
      </Button>
    )
  }
  if (record.status === 'completed') {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <p className="flex flex-1 items-center gap-2 font-medium text-(--success)">
          <Icon icon={CheckmarkCircle02Icon} size={22} />
          Done in {Math.max(1, Math.round((record.updatedAt - record.createdAt) / 60_000))} min
        </p>
        <Button variant="secondary" render={<Link href={againHref(record)} />} nativeButton={false}>
          Swap again
        </Button>
      </div>
    )
  }
  if (record.status === 'refunded' || record.status === 'failed' || record.status === 'expired') {
    return (
      <Button
        variant="secondary"
        size="lg"
        render={<Link href={againHref(record)} />}
        nativeButton={false}
        className={cn('w-fit')}
      >
        {record.status === 'expired' ? 'Start again with a fresh quote' : 'Try again with a new quote'}
      </Button>
    )
  }
  return (
    <p className="flex items-center gap-2 text-muted-foreground text-sm">
      <Spinner className="size-4" />
      Checking with {PROVIDERS[record.provider].name} every few seconds…
    </p>
  )
}
