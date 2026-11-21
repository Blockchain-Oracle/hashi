'use client'

import { BankIcon, InformationCircleIcon, QrCodeIcon, Wallet01Icon } from '@hugeicons/core-free-icons'
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
              'flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-2 font-medium text-sm transition-colors',
              on
                ? 'bg-foreground text-background shadow-sm'
                : 'text-foreground/70 hover:bg-card hover:text-foreground',
            )}
          >
            {/* On a narrow phone the words alone fit on one line. */}
            <Icon icon={o.icon} size={17} className="max-[400px]:hidden" />
            {o.text}
          </button>
        )
      })}
    </fieldset>
  )
}

/** The why behind a field, one tap or hover away instead of a sentence on the card (a tap works on a phone). */
function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={80}
        aria-label={label}
        className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon icon={InformationCircleIcon} size={15} />
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
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string
  tip: ReactNode
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
        <InfoTip label={`About: ${label}`}>{tip}</InfoTip>
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
 * from an exchange (or any wallet) to the address Hashi shows, and gives a wallet of their own for a refund.
 * Receiving out, the stablecoin can land at an exchange deposit address (or any wallet): NEAR Intents pays with a
 * plain token transfer, which an exchange credits like any withdrawal.
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
            { id: 'send', icon: QrCodeIcon, text: 'Send from exchange' },
          ]}
        />
        {selfSend ? (
          <Field
            label={`Your ${chain.name} wallet, for refunds`}
            tip={`If the swap can't go through, NEAR Intents sends the ${symbol} back to this address. Use a wallet you own: an exchange may not credit a refund sent to it.`}
            value={state.refundTo || stableAddress || ''}
            placeholder={solana ? 'Your Solana wallet address' : `0x… your wallet on ${chain.name}`}
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
          { id: 'address', icon: BankIcon, text: 'Send to exchange' },
        ]}
      />
      {toAddress ? (
        <Field
          label={`Exchange deposit address on ${chain.name}`}
          tip={`In your exchange, open the ${symbol} deposit page, pick the ${chain.name} network, and copy the address. Any wallet address on ${chain.name} works too: the ${symbol} arrives as a normal transfer.`}
          value={state.recipient}
          placeholder={solana ? 'Solana address' : '0x…'}
          error={recipient && !recipient.ok ? recipient.error : undefined}
          onChange={(value) => dispatch({ type: 'recipient', value })}
        />
      ) : null}
    </div>
  )
}
