'use client'

import { ArrowLeftRightIcon, QrCodeIcon } from '@hugeicons/core-free-icons'
import { Icon } from '@/components/kit/icon'
import { CHAINS } from '@/lib/constants/chains'
import { cn } from '@/lib/utils'
import type { useSwap } from './use-swap'

/**
 * Into Bitcoin Cash, how the person pays: from a connected wallet (one approval there), or sent from an exchange or
 * any wallet to the address Hashi shows. Sending it yourself needs one thing more: where a refund goes, which must be
 * an address of the person's own (an exchange may not credit a refund sent to it).
 */
export function PayBy({ swap }: { swap: ReturnType<typeof useSwap> }) {
  const { state, dispatch, pair, selfSend, refundText, refundCheck, stableAddress } = swap
  if (pair.direction !== 'in') return null
  const chain = CHAINS[pair.stable.chain].name

  if (!selfSend) {
    return (
      <button
        type="button"
        onClick={() => dispatch({ type: 'payBy', value: 'send' })}
        className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon icon={QrCodeIcon} size={16} />
        Or send it from an exchange or another wallet
      </button>
    )
  }

  const invalid = refundCheck && !refundCheck.ok
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-muted/60 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium text-sm">
          <Icon icon={QrCodeIcon} size={18} className="text-primary" />
          Send it yourself
        </span>
        <button
          type="button"
          onClick={() => dispatch({ type: 'payBy', value: 'wallet' })}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon icon={ArrowLeftRightIcon} size={14} />
          Use a wallet
        </button>
      </div>
      <p className="text-foreground/70 text-sm leading-relaxed">
        From an exchange or any wallet. Hashi shows the address and watches for your {pair.stable.symbol}.
      </p>
      <input
        value={state.refundTo || stableAddress || ''}
        onChange={(e) => dispatch({ type: 'refundTo', value: e.target.value })}
        placeholder={`Refund address: yours, on ${chain}`}
        aria-label={`Refund address on ${chain}`}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          'h-11 w-full rounded-xl bg-card px-3 font-mono text-sm outline-none ring-1 ring-border focus:shadow-[inset_0_0_0_1.5px_var(--ring)]',
          invalid && 'shadow-[inset_0_0_0_1.5px_var(--destructive)]',
        )}
      />
      <p className={cn('text-xs leading-relaxed', invalid ? 'text-destructive' : 'text-muted-foreground')}>
        {invalid
          ? refundCheck.error
          : refundText
            ? `If the swap can't go through, the ${pair.stable.symbol} comes back here. Not an exchange address.`
            : `A wallet of yours on ${chain}, for a refund. Not an exchange address: refunds sent there can be lost.`}
      </p>
    </div>
  )
}
