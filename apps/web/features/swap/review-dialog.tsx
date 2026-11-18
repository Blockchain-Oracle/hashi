'use client'

import { ArrowDown02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'
import NumberFlow from '@number-flow/react'
import { type ReactNode, useRef, useState } from 'react'
import { CopyButton } from '@/components/kit/copy-button'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain, BrandLogo } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { BCH_ASSETS } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import { SWAP_ON_ARRIVAL } from '@/lib/constants/features'
import type { FeeLineId } from '@/lib/engine/costs'
import type { SideAsset } from '@/lib/engine/pair'
import { PROVIDERS, type Route } from '@/lib/engine/types'
import { displayDecimals, formatAmount, formatDuration, formatUsd, shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RouteName } from './route-list'
import type { Swap } from './use-swap'

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 2 } as const

/** Who is asked to approve what, per wallet, for this route. */
function approvals(route: Route): { wallet: string; count: number }[] {
  const { pair } = route
  if (pair.direction === 'in') {
    return [
      { wallet: `${CHAINS[pair.stable.chain].name} wallet`, count: route.provider === 'near' ? 1 : 2 },
      // With the swap contract, the trade into PUSD or MUSD needs no approval from the Bitcoin Cash wallet.
      ...(pair.bchAsset === 'BCH' || SWAP_ON_ARRIVAL ? [] : [{ wallet: 'Bitcoin Cash wallet', count: 1 }]),
    ]
  }
  return [{ wallet: 'Bitcoin Cash wallet', count: route.signatures }]
}

/** What happens if the price moves, per route, in the words the provider's own rules support. */
function safetyNote(route: Route): string {
  if (route.provider === 'cauldron') {
    return 'Cauldron settles in one Bitcoin Cash transaction, at the built price or not at all: if the pools move past your slippage first, nothing leaves your wallet.'
  }
  return route.provider === 'near'
    ? 'If the price moves past your slippage or the deposit is late, NEAR Intents refunds it to the refund address.'
    : 'If the price moves past your slippage, THORChain refunds the deposit to the refund address, minus its network fee.'
}

function rate(route: Route, pay: Swap['pay'], receive: Swap['receive']) {
  const out = Number(route.amountOut) / 10 ** receive.decimals
  const inn = Number(route.amountIn) / 10 ** pay.decimals
  if (!inn) return ''
  const per = out / inn
  const digits = per >= 100 ? 2 : per >= 1 ? 4 : 8
  return `1 ${pay.symbol} = ${per.toLocaleString('en-US', { maximumFractionDigits: digits })} ${receive.symbol}`
}

/**
 * The last look before any wallet is asked: both amounts, the
 * route leg by leg, every fee in dollars, the least that can arrive, both addresses, where a refund goes, and
 * how many approvals each wallet will see. Numbers stay live: quotes keep refreshing while it is open.
 */
export function ReviewDialog({
  swap,
  open,
  onOpenChange,
  onConfirm,
  confirming,
}: {
  swap: Swap
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (options: { gasless: boolean }) => void
  confirming: boolean
}) {
  const { selected: route, pay, receive, costs, depositFees, addresses, pair, payUsd, receiveUsd } = swap
  // Focus lands on the top of the sheet, so it opens on the amounts (and Enter never starts a swap by accident).
  const top = useRef<HTMLDivElement>(null)
  const [gaslessChoice, setGaslessChoice] = useState(false)
  if (!route || !addresses) return null
  // Gasless: sign an authorisation instead of a transfer; Hashi's relayer pays the gas (NEAR route, Base USDC).
  const gaslessOffered = swap.gaslessAvailable && route.provider === 'near'
  const needsGasless = swap.step.kind === 'review' && swap.step.needsGasless === true
  const gasless = gaslessOffered && (gaslessChoice || needsGasless)
  const cost = costs[route.provider]
  const local = pair.direction === 'local'
  const chainName = pair.direction === 'local' ? 'Bitcoin Cash' : CHAINS[pair.stable.chain].name
  const fee = route.provider === 'cauldron' ? undefined : depositFees[route.provider]
  const receiveFraction = displayDecimals(receive.symbol)

  const lineLabel: Record<FeeLineId, ReactNode> = {
    bridge: (
      <span className="flex items-center gap-1.5">
        <BrandLogo brand={route.provider} size={16} /> {PROVIDERS[route.provider].name}
      </span>
    ),
    cauldron: (
      <span className="flex items-center gap-1.5">
        <BrandLogo brand="cauldron" size={16} /> Cauldron swap
      </span>
    ),
    network: pair.direction === 'in' ? `${chainName} network fee` : 'Bitcoin Cash network fee',
  }

  // Bitcoin Cash tokens live at the wallet's token-aware address; plain BCH at its plain one.
  const bchAddress = (side: SideAsset) => (side.symbol === 'BCH' ? addresses.bchPlain : addresses.bchToken)
  const from = pay.stable ? addresses.stableSide : bchAddress(pay)
  const to = receive.stable ? addresses.stableSide : bchAddress(receive)
  // A bridge refunds to the paying side; a Cauldron trade either happens or leaves everything where it was.
  const refund = local ? undefined : pair.direction === 'in' ? addresses.stableSide : addresses.bchPlain

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        initialFocus={top}
        className="max-h-[92dvh] max-sm:rounded-t-[1.75rem] sm:max-w-[30rem] sm:rounded-[1.75rem]"
      >
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <div ref={top} tabIndex={-1} className="px-6 pt-6 outline-none">
            <DialogTitle className="font-medium text-xl tracking-[-0.03em]">Review swap</DialogTitle>
            <DialogDescription className="mt-1">
              Nothing moves until you approve in your wallet.
            </DialogDescription>
          </div>

          <div className="mx-6 mt-5 rounded-[1.6rem] bg-muted p-4">
            <Leg
              label="You pay"
              amount={formatAmount(route.amountIn, pay.decimals, displayDecimals(pay.symbol))}
              symbol={pay.symbol}
              chain={pay.chain}
              usd={payUsd}
            />
            <div className="my-2 flex items-center gap-2 pl-1 text-muted-foreground text-xs">
              <Icon icon={ArrowDown02Icon} />
              <RouteName route={route} logos />
            </div>
            <Leg
              label="You receive"
              amount={
                <NumberFlow
                  locales="en-US"
                  value={Number(route.amountOut) / 10 ** receive.decimals}
                  format={{
                    maximumFractionDigits: receiveFraction,
                    minimumFractionDigits: Math.min(2, receiveFraction),
                  }}
                />
              }
              symbol={receive.symbol}
              chain={receive.chain}
              usd={receiveUsd}
            />
          </div>

          <dl className="mx-6 mt-4 flex flex-col divide-y divide-border text-sm">
            <Row term="Rate">{rate(route, pay, receive)}</Row>
            <Row term="You get at least">
              {formatAmount(route.minAmountOut, receive.decimals, receiveFraction)} {receive.symbol}
              <span className="text-muted-foreground">
                {' '}
                · {(swap.state.slippageBps / 100).toFixed(2)}% slippage
              </span>
            </Row>
            <Row term="Arrives in">{formatDuration(route.etaSeconds)}</Row>
            {cost ? (
              <div className="flex flex-col gap-1.5 py-3">
                <dt className="text-muted-foreground">Fees</dt>
                {cost.lines.map((line) => (
                  <dd key={line.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{lineLabel[line.id]}</span>
                    <span className="font-mono">
                      {line.id === 'network' && gasless ? (
                        <span className="text-(--success)">Paid by Hashi</span>
                      ) : (
                        <>
                          {line.id === 'network' && fee && pair.direction === 'in' ? (
                            <span className="mr-2 text-muted-foreground text-xs">
                              {formatAmount(fee.native, fee.nativeDecimals, 6)} {fee.nativeSymbol}
                            </span>
                          ) : null}
                          {formatUsd(line.usd)}
                        </>
                      )}
                    </span>
                  </dd>
                ))}
                <dd className="flex items-center justify-between gap-3 font-medium">
                  <span>Total</span>
                  <span className="font-mono">
                    {formatUsd(
                      cost.totalUsd - (gasless ? (cost.lines.find((l) => l.id === 'network')?.usd ?? 0) : 0),
                    )}
                  </span>
                </dd>
              </div>
            ) : null}
            {gaslessOffered ? (
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block">Pay no gas</span>
                  <span className="block text-muted-foreground text-xs">
                    {needsGasless
                      ? 'You have no ETH on Base; you sign, and Hashi pays the gas.'
                      : 'Sign instead of sending; Hashi pays the Base gas for you.'}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={gasless}
                  aria-label="Pay no gas"
                  disabled={needsGasless}
                  onClick={() => setGaslessChoice((v) => !v)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60',
                    gasless ? 'bg-primary' : 'bg-muted ring-1 ring-border',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 size-5 rounded-full bg-white shadow-card transition-[left]',
                      gasless ? 'left-6' : 'left-1',
                    )}
                  />
                </button>
              </div>
            ) : null}
            <Row term="Approvals">
              {approvals(route)
                .map(
                  (a) =>
                    `${a.count} ${gasless && a.wallet !== 'Bitcoin Cash wallet' ? 'signature' : 'approval'}${a.count === 1 ? '' : 's'} in your ${a.wallet}`,
                )
                .join(', ')}
              {SWAP_ON_ARRIVAL && route.pair.direction === 'in' && route.pair.bchAsset !== 'BCH'
                ? `. The ${route.pair.bchAsset} trade on Bitcoin Cash runs by itself.`
                : route.pair.direction === 'out' && route.pair.bchAsset !== 'BCH' && route.signatures === 1
                  ? `. The ${route.pair.bchAsset} sale pays NEAR Intents in the same transaction.`
                  : null}
            </Row>
            {from ? <Address term="From" value={from} /> : null}
            {to ? <Address term="To" value={to} /> : null}
            {refund ? <Address term="Refunds go to" value={refund} /> : null}
          </dl>

          <p className="mx-6 mt-3 mb-4 flex gap-2 rounded-2xl bg-muted p-3 text-muted-foreground text-xs leading-relaxed">
            <Icon icon={InformationCircleIcon} className="mt-0.5 shrink-0" />
            {safetyNote(route)}
          </p>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 border-border border-t p-4 sm:px-6">
          <Button variant="soft" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="lg" onClick={() => onConfirm({ gasless })} disabled={confirming}>
            {confirming ? <Spinner className="size-4" /> : null}
            {confirming ? 'Starting…' : 'Start swap'}
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

function Leg({
  label,
  amount,
  symbol,
  chain,
  usd,
}: {
  label: string
  amount: ReactNode
  symbol: SideAsset['symbol']
  chain: keyof typeof CHAINS
  usd: number | undefined
}) {
  return (
    <div className="flex items-center gap-3">
      <AssetOnChain asset={symbol} chain={chain} size={38} />
      <div className="min-w-0 flex-1">
        <p className="label-mono">{label}</p>
        <p className="truncate text-2xl text-amount">
          {amount} <span className="font-sans text-base text-muted-foreground tracking-normal">{symbol}</span>
        </p>
      </div>
      <div className="text-right text-muted-foreground text-xs">
        {usd !== undefined ? (
          <NumberFlow locales="en-US" value={usd} format={USD} className="font-mono" />
        ) : null}
        <p>{chain === 'bch' && symbol !== 'BCH' ? BCH_ASSETS[symbol as 'PUSD'].name : CHAINS[chain].name}</p>
      </div>
    </div>
  )
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-muted-foreground">{term}</dt>
      <dd className={cn('text-right')}>{children}</dd>
    </div>
  )
}

function Address({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="flex items-center gap-1 font-mono">
        <span title={value}>{shortAddress(value, 6, 6)}</span>
        <CopyButton value={value} label={`Copy ${term.toLowerCase()} address`} />
      </dd>
    </div>
  )
}
