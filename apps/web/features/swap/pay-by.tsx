'use client'

import {
  Alert02Icon,
  BankIcon,
  InformationCircleIcon,
  QrCodeIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import { type ReactNode, useId } from 'react'
import { Icon } from '@/components/kit/icon'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { CHAINS } from '@/lib/constants/chains'
import { cn } from '@/lib/utils'
import type { useSwap } from './use-swap'

type Swap = ReturnType<typeof useSwap>

/** Two ways, side by side, the chosen one filled in ink: nobody misses the second. */
function Switch({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: string; icon: typeof Wallet01Icon; text: string }[]
  value: string
  onChange: (id: string) => void
  label: string
}) {
  return (
    <fieldset
      aria-label={label}
      className="m-0 grid min-w-0 grid-cols-2 gap-1 rounded-full border-0 bg-muted p-1"
    >
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex min-h-10 items-center justify-center gap-1.5 text-balance rounded-full px-2 py-1.5 text-center font-medium text-sm leading-tight transition-colors',
              on
                ? 'bg-foreground text-background shadow-sm'
                : 'text-foreground/70 hover:bg-card hover:text-foreground',
            )}
          >
            {/* On a narrow phone the words alone have the room (they wrap onto two centred lines). */}
            <Icon icon={o.icon} size={17} className="shrink-0 max-[400px]:hidden" />
            {o.text}
          </button>
        )
      })}
    </fieldset>
  )
}

/** The why behind a field, one tap or hover away instead of a sentence on the card (a tap works on a phone). */
function InfoTip({ label, warn = false, children }: { label: string; warn?: boolean; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={80}
        aria-label={label}
        className={cn(
          'grid size-5 place-items-center rounded-full transition-colors hover:text-foreground',
          warn ? 'text-(--warning)' : 'text-muted-foreground',
        )}
      >
        <Icon icon={warn ? Alert02Icon : InformationCircleIcon} size={15} />
      </PopoverTrigger>
      <PopoverPopup tooltipStyle side="top" className="max-w-[17rem] text-xs leading-relaxed">
        {children}
      </PopoverPopup>
    </Popover>
  )
}

/** One address field: a plain label with an info tip, and the error under it only when there is one. */
function Field({
  label,
  tip,
  warn = false,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string
  tip: ReactNode
  /** The tip is a warning (an amber sign), not just an explanation. */
  warn?: boolean
  value: string
  placeholder: string
  error: string | undefined
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 px-1 text-xs">
        <label htmlFor={id} className="font-medium text-foreground/80">
          {label}
        </label>
        <InfoTip label={`About: ${label}`} warn={warn}>
          {tip}
        </InfoTip>
      </span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          'h-11 w-full rounded-xl bg-card px-3 font-mono text-sm outline-none ring-1 ring-border focus:shadow-[inset_0_0_0_1.5px_var(--ring)]',
          error && 'shadow-[inset_0_0_0_1.5px_var(--destructive)]',
        )}
      />
      {error ? <span className="px-1 text-destructive text-xs">{error}</span> : null}
    </div>
  )
}

/**
 * The stablecoin side of a bridged swap needs no wallet of its own, either way. Paying in, the person can send it
 * from an exchange (or any wallet) to the address Hashi shows, and gives an address for a refund. Receiving out, the
 * stablecoin can land at an exchange deposit address (or any wallet).
 *
 * Checked on chain (2026-11-21): on Base, NEAR Intents' payouts and refunds are plain ERC-20 transfers from an
 * ordinary account, which an exchange credits like any withdrawal (above its minimum deposit). On Solana both come
 * from NEAR's own program as an inner token transfer, which some exchanges miss, so there a wallet is advised.
 */
export function PayBy({ swap }: { swap: Swap }) {
  const { state, dispatch, pair, selfSend, toAddress, refundCheck, recipient, stableAddress } = swap
  if (pair.direction === 'local') return null
  const chain = CHAINS[pair.stable.chain]
  const symbol = pair.stable.symbol
  const solana = chain.kind === 'solana'

  if (pair.direction === 'in') {
    return (
      <div className="flex flex-col gap-2.5">
        <Switch
          label="How you pay"
          value={selfSend ? 'send' : 'wallet'}
          onChange={(id) => dispatch({ type: 'payBy', value: id === 'send' ? 'send' : 'wallet' })}
          options={[
            { id: 'wallet', icon: Wallet01Icon, text: 'Connect wallet' },
            { id: 'send', icon: QrCodeIcon, text: 'Send from exchange or wallet' },
          ]}
        />
        {selfSend ? (
          <Field
            label={`Refund address on ${chain.name}`}
            warn={solana}
            tip={
              solana
                ? `If the swap can't go through, NEAR Intents sends the ${symbol} back here. On Solana it comes from NEAR's own program, which some exchanges don't credit: use a wallet you own.`
                : `If the swap can't go through, NEAR Intents sends the ${symbol} back here as a normal transfer. Your exchange's ${symbol} deposit address on ${chain.name} works, or any wallet. A refund under the exchange's minimum deposit may not be credited.`
            }
            value={state.refundTo || stableAddress || ''}
            placeholder={solana ? 'Your Solana wallet address' : '0x… wallet or exchange deposit'}
            error={refundCheck && !refundCheck.ok ? refundCheck.error : undefined}
            onChange={(value) => dispatch({ type: 'refundTo', value })}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Switch
        label={`Where the ${symbol} goes`}
        value={toAddress ? 'address' : 'wallet'}
        onChange={(id) => dispatch({ type: 'receiveBy', value: id === 'address' ? 'address' : 'wallet' })}
        options={[
          { id: 'wallet', icon: Wallet01Icon, text: 'Connect wallet' },
          { id: 'address', icon: BankIcon, text: 'Send to exchange or wallet' },
        ]}
      />
      {toAddress ? (
        <Field
          label={`Receiving address on ${chain.name}`}
          warn={solana}
          tip={
            solana
              ? `Where the ${symbol} lands: a wallet on Solana. On Solana the ${symbol} comes from NEAR's own program, which some exchanges don't credit, so an exchange deposit address is a risk there.`
              : `Where the ${symbol} lands: any wallet on ${chain.name}, or your exchange's ${symbol} deposit address for the ${chain.name} network. It arrives as a normal transfer; an exchange credits it above its minimum deposit.`
          }
          value={state.recipient}
          placeholder={solana ? 'Your Solana wallet address' : '0x… wallet or exchange deposit'}
          error={recipient && !recipient.ok ? recipient.error : undefined}
          onChange={(value) => dispatch({ type: 'recipient', value })}
        />
      ) : null}
    </div>
  )
}
