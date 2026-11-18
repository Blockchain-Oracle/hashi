'use client'

import {
  ArrowDataTransferVerticalIcon,
  InformationCircleIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import { useCallback, useState } from 'react'
import { Glow } from '@/components/kit/glow'
import { Icon } from '@/components/kit/icon'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useBchWallet } from '@/features/wallets/bch-wallet'
import { useEvmWallet } from '@/features/wallets/evm-wallet'
import { BCH_ASSETS } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import type { SideAsset } from '@/lib/engine/pair'
import { displayDecimals, formatAmount, shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'
import { type PanelAsset, PayPanel, ReceivePanel } from './asset-panel'
import { ReviewDialog } from './review-dialog'
import { RouteList } from './route-list'
import { SettingsPopover } from './settings-popover'
import { type PickedAsset, type Side, sidesOf, stableId } from './state'
import { StatusPopover } from './status-popover'
import { TokenPicker } from './token-picker'
import { type SwapStep, useSwap } from './use-swap'

const DOLLAR_PRESETS = ['10', '50', '100']
const BCH_PRESETS = ['0.01', '0.05', '0.1']

/** How a side reads in its panel: the chain for a stablecoin, the token's name on Bitcoin Cash. */
function panelAsset(side: SideAsset): PanelAsset {
  const caption = side.stable
    ? `on ${CHAINS[side.chain].name}`
    : side.symbol === 'BCH'
      ? 'on Bitcoin Cash'
      : `${BCH_ASSETS[side.symbol as 'PUSD' | 'MUSD'].name} on Bitcoin Cash`
  return { symbol: side.symbol, chain: side.chain, caption }
}

function pickedKey(asset: PickedAsset) {
  return asset.kind === 'stable' ? stableId(asset.stable) : asset.id
}

/**
 * The swap card: stacked pay and receive panels, the route pick, and the glossy button, on a vermilion glow. Prices appear from the first keystroke; the button walks the person through what is missing, one thing
 * at a time, until the review.
 */
export function SwapCard({
  initialQuery,
  syncUrl = true,
  onConfirm,
  confirming = false,
}: {
  initialQuery: string
  /** Keep the address bar in step with the swap (off when the card is shown somewhere else, like /dev). */
  syncUrl?: boolean
  onConfirm?: (swap: ReturnType<typeof useSwap>, options: { gasless: boolean }) => void
  confirming?: boolean
}) {
  const swap = useSwap(new URLSearchParams(initialQuery), { syncUrl })
  const { state, dispatch, pay, receive, selected, step, balances, prices } = swap
  const evm = useEvmWallet()
  const bch = useBchWallet()
  const [picker, setPicker] = useState<Side | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  // Stable callbacks, so the (memoised) picker skips the re-render on every keystroke.
  const closePicker = useCallback((open: boolean) => {
    if (!open) setPicker(null)
  }, [])
  const pickAsset = useCallback(
    (asset: PickedAsset) => {
      if (picker) dispatch({ type: 'pick', side: picker, asset })
    },
    [picker, dispatch],
  )

  const payAsset = panelAsset(pay)
  const receiveAsset = panelAsset(receive)
  const onSides = sidesOf(state)

  const flip = () => {
    const amount = selected
      ? formatAmount(selected.amountOut, receive.decimals, displayDecimals(receive.symbol)).replace(/,/g, '')
      : ''
    dispatch({ type: 'flip', amount })
  }

  return (
    <div className="relative mx-auto w-full max-w-[30rem]">
      <Glow />
      <div className="relative rounded-[2.25rem] border border-border bg-card p-2 shadow-float">
        <div className="flex items-center justify-between py-1.5 pr-1.5 pl-3.5">
          <h2 className="font-medium text-[1.0625rem]">Swap</h2>
          <div className="flex items-center gap-0.5">
            <StatusPopover />
            <SettingsPopover swap={swap} />
          </div>
        </div>

        <PayPanel
          label="You pay"
          asset={payAsset}
          amount={state.amount}
          onAmount={(value) => dispatch({ type: 'amount', value })}
          onPick={() => setPicker('pay')}
          usd={swap.payUsd}
          balance={swap.payBalance}
          decimals={pay.decimals}
          onMax={swap.maxText ? () => dispatch({ type: 'amount', value: swap.maxText as string }) : undefined}
          presets={pay.symbol === 'BCH' ? BCH_PRESETS : DOLLAR_PRESETS}
        />

        <div className="relative z-10 -my-[1.15rem] flex justify-center">
          <button
            type="button"
            onClick={flip}
            aria-label="Swap direction"
            className="group flex size-11 items-center justify-center rounded-2xl border-[5px] border-card bg-muted text-foreground transition-colors hover:bg-accent"
          >
            <Icon
              icon={ArrowDataTransferVerticalIcon}
              size={20}
              className="transition-transform duration-300 group-hover:rotate-180"
            />
          </button>
        </div>

        <ReceivePanel
          label="You receive"
          asset={receiveAsset}
          onPick={() => setPicker('receive')}
          amount={selected?.amountOut}
          decimals={receive.decimals}
          fraction={displayDecimals(receive.symbol)}
          usd={swap.receiveUsd}
          loading={
            Boolean(swap.req) &&
            !selected &&
            (swap.queries.near.isFetching ||
              swap.queries.thorchain.isFetching ||
              swap.queries.cauldron.isFetching)
          }
          updating={swap.updating}
          destination={<Destination swap={swap} />}
        />

        {state.notice ? (
          <p
            role="status"
            className="mx-1 mt-3 flex items-start gap-2 rounded-2xl bg-muted px-3 py-2.5 text-foreground/80 text-sm"
          >
            <Icon icon={InformationCircleIcon} className="mt-0.5 shrink-0 text-muted-foreground" />
            {state.notice}
          </p>
        ) : null}

        <div className="px-1 pt-3">
          <RouteList swap={swap} onUseMinimum={(value) => dispatch({ type: 'amount', value })} />
        </div>

        <div className="p-1 pt-3">
          <StepButton
            step={step}
            onUseMinimum={(value) => dispatch({ type: 'amount', value })}
            onConnectStable={(ns) => evm.connect(ns)}
            onConnectBch={bch.openConnect}
            onReview={() => setReviewOpen(true)}
          />
        </div>
      </div>

      <TokenPicker
        open={picker !== null}
        onOpenChange={closePicker}
        side={picker ?? 'pay'}
        currentKey={pickedKey(picker === 'receive' ? onSides.receive : onSides.pay)}
        other={picker === 'receive' ? onSides.pay : onSides.receive}
        fallback={state.bchAsset}
        onPick={pickAsset}
        balances={balances}
        prices={prices}
      />
      <ReviewDialog
        swap={swap}
        open={reviewOpen && step.kind === 'review'}
        onOpenChange={setReviewOpen}
        onConfirm={(options) => onConfirm?.(swap, options)}
        confirming={confirming || !onConfirm}
      />
    </div>
  )
}

/** Where the money lands: the connected wallet, a custom address, or a prompt to connect one. */
function Destination({ swap }: { swap: ReturnType<typeof useSwap> }) {
  const { pair, recipient, stableAddress, stableKind } = swap
  const evm = useEvmWallet()
  const bch = useBchWallet()
  const custom = recipient?.ok ? recipient.address : undefined
  const chip =
    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-xs'

  if (custom) {
    return <span className={cn(chip, 'bg-primary/10 text-primary')}>to {shortAddress(custom)}</span>
  }
  if (pair.direction !== 'out') {
    // Into Bitcoin Cash, or staying on it: the Bitcoin Cash wallet (its token address for PUSD and MUSD).
    const received = pair.direction === 'local' ? pair.to : pair.bchAsset
    const address = received === 'BCH' ? bch.receive?.plain : bch.receive?.token
    return address ? (
      <span className={cn(chip, 'text-muted-foreground')}>
        <Icon icon={Wallet01Icon} />
        {shortAddress(address)}
      </span>
    ) : (
      <button
        type="button"
        onClick={bch.openConnect}
        className={cn(chip, 'bg-card font-sans font-medium shadow-card')}
      >
        Connect BCH wallet
      </button>
    )
  }
  return stableAddress ? (
    <span className={cn(chip, 'text-muted-foreground')}>
      <Icon icon={Wallet01Icon} />
      {shortAddress(stableAddress)}
    </span>
  ) : (
    <button
      type="button"
      onClick={() => evm.connect(stableKind === 'solana' ? 'solana' : 'eip155')}
      className={cn(chip, 'bg-card font-sans font-medium shadow-card')}
    >
      Connect {stableKind === 'solana' ? 'Solana' : 'EVM'} wallet
    </button>
  )
}

/** The card's one big button: the first thing missing, or the review. */
export function StepButton({
  step,
  onUseMinimum,
  onConnectStable,
  onConnectBch,
  onReview,
}: {
  step: SwapStep
  onUseMinimum: (amount: string) => void
  onConnectStable: (namespace: 'eip155' | 'solana') => void
  onConnectBch: () => void
  onReview: () => void
}) {
  switch (step.kind) {
    case 'enter-amount':
      return (
        <Button size="xl" disabled>
          Enter an amount
        </Button>
      )
    case 'connect-stable':
      return (
        <Button size="xl" variant="secondary" onClick={() => onConnectStable(step.namespace)}>
          <Icon icon={Wallet01Icon} />
          Connect {step.namespace === 'solana' ? 'a Solana' : 'an EVM'} wallet
        </Button>
      )
    case 'connect-bch':
      return (
        <Button size="xl" variant="secondary" onClick={onConnectBch}>
          <Icon icon={Wallet01Icon} />
          Connect a Bitcoin Cash wallet
        </Button>
      )
    case 'fix-recipient':
      return (
        <Button size="xl" disabled>
          Check the recipient address
        </Button>
      )
    case 'insufficient':
      return (
        <Button size="xl" disabled>
          Not enough {step.symbol}
        </Button>
      )
    case 'insufficient-gas':
      return (
        <Button size="xl" disabled>
          Not enough {step.symbol} for gas on {step.chain}
        </Button>
      )
    case 'needs-bch-fee':
      return (
        <Button size="xl" disabled className="whitespace-normal">
          Needs {formatAmount(step.sats, 8, 5)} BCH for the network fee
        </Button>
      )
    case 'finding':
      return (
        <Button size="xl" disabled>
          <Spinner className="size-4" />
          Finding routes…
        </Button>
      )
    case 'below-minimum':
      return (
        <Button size="xl" variant="secondary" onClick={() => onUseMinimum(step.amount)}>
          Too small. Use {step.amount} {step.symbol}
        </Button>
      )
    case 'no-route':
      return (
        <Button size="xl" disabled className="whitespace-normal">
          {step.message}
        </Button>
      )
    case 'review':
      return (
        <Button size="xl" onClick={onReview}>
          Review swap
        </Button>
      )
  }
}
