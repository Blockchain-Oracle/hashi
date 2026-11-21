'use client'

import { ClipboardPasteIcon, QrCodeIcon, Wallet01Icon } from '@hugeicons/core-free-icons'
import type { ReactNode } from 'react'
import { Icon } from '@/components/kit/icon'
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
              'flex h-10 items-center justify-center gap-2 rounded-full font-medium text-sm transition-colors',
              on
                ? 'bg-foreground text-background shadow-sm'
                : 'text-foreground/70 hover:bg-card hover:text-foreground',
            )}
          >
            <Icon icon={o.icon} size={17} />
            {o.text}
          </button>
        )
      })}
    </fieldset>
  )
}

/** One labelled address field: the label and a few words beside it, the error under it only when there is one. */
function Field({
  label,
  note,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string
  note: string
  value: string
  placeholder: string
  error: string | undefined
  onChange: (value: string) => void
}): ReactNode {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2 px-1 text-xs">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="text-muted-foreground">{note}</span>
      </span>
      <input
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
    </label>
  )
}

/**
 * The stablecoin side of a bridged swap needs no wallet of its own, either way. Paying in, the person can send it
 * themselves from an exchange or any wallet (and gives a refund address of their own). Receiving out, the stablecoin
 * can land at any address on that chain: NEAR Intents pays with a plain token transfer, which a wallet or an
 * exchange deposit address takes like any withdrawal.
 */
export function PayBy({ swap }: { swap: Swap }) {
  const { state, dispatch, pair, selfSend, toAddress, refundCheck, recipient, stableAddress } = swap
  if (pair.direction === 'local') return null
  const chain = CHAINS[pair.stable.chain]
  const placeholder = chain.kind === 'solana' ? 'Solana address' : '0x…'

  if (pair.direction === 'in') {
    return (
      <div className="flex flex-col gap-2.5">
        <Switch
          label="How you pay"
          value={selfSend ? 'send' : 'wallet'}
          onChange={(id) => dispatch({ type: 'payBy', value: id === 'send' ? 'send' : 'wallet' })}
          options={[
            { id: 'wallet', icon: Wallet01Icon, text: 'From my wallet' },
            { id: 'send', icon: QrCodeIcon, text: 'Send it yourself' },
          ]}
        />
        {selfSend ? (
          <Field
            label={`Refund address on ${chain.name}`}
            note="yours, not an exchange's"
            value={state.refundTo || stableAddress || ''}
            placeholder={placeholder}
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
        label={`Where the ${pair.stable.symbol} goes`}
        value={toAddress ? 'address' : 'wallet'}
        onChange={(id) => dispatch({ type: 'receiveBy', value: id === 'address' ? 'address' : 'wallet' })}
        options={[
          { id: 'wallet', icon: Wallet01Icon, text: 'To my wallet' },
          { id: 'address', icon: ClipboardPasteIcon, text: 'To an address' },
        ]}
      />
      {toAddress ? (
        <Field
          label={`${pair.stable.symbol} lands at, on ${chain.name}`}
          note="a wallet or an exchange"
          value={state.recipient}
          placeholder={placeholder}
          error={recipient && !recipient.ok ? recipient.error : undefined}
          onChange={(value) => dispatch({ type: 'recipient', value })}
        />
      ) : null}
    </div>
  )
}
