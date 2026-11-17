'use client'

import { Settings02Icon } from '@hugeicons/core-free-icons'
import { useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { Button } from '@/components/ui/button'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { CHAINS } from '@/lib/constants/chains'
import { DEFAULT_SLIPPAGE_BPS } from '@/lib/constants/limits'
import { cn } from '@/lib/utils'
import type { Swap } from './use-swap'

const PRESETS = [50, 100, 200, 300] as const
const MAX_BPS = 5000

/**
 * Swap settings: how far the price may move before the swap refunds instead of filling,
 * and an optional recipient on the destination chain, checked as it is typed.
 */
export function SettingsPopover({ swap }: { swap: Swap }) {
  const { state, dispatch, pair, recipientAllowed, recipient } = swap
  const custom = !PRESETS.includes(state.slippageBps as (typeof PRESETS)[number])
  const [customText, setCustomText] = useState(custom ? String(state.slippageBps / 100) : '')
  const destination = pair.direction === 'out' ? CHAINS[pair.stable.chain].name : 'Bitcoin Cash'
  const received = pair.direction === 'local' ? pair.to : pair.bchAsset

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Swap settings" />}
        className={cn(state.slippageBps !== DEFAULT_SLIPPAGE_BPS && 'text-primary')}
      >
        <Icon icon={Settings02Icon} />
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex flex-col gap-5 p-1">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">Max slippage</span>
              <span className="font-mono text-muted-foreground text-sm">
                {(state.slippageBps / 100).toFixed(2)}%
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 rounded-2xl bg-muted p-1">
              {PRESETS.map((bps) => (
                <button
                  key={bps}
                  type="button"
                  onClick={() => {
                    setCustomText('')
                    dispatch({ type: 'slippage', bps })
                  }}
                  className={cn(
                    'h-9 rounded-xl font-mono text-sm transition-colors',
                    state.slippageBps === bps
                      ? 'bg-card shadow-card'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {bps === DEFAULT_SLIPPAGE_BPS ? 'Auto' : `${bps / 100}%`}
                </button>
              ))}
              <label
                className={cn(
                  'flex h-9 items-center rounded-xl px-2 font-mono text-sm',
                  custom ? 'bg-card shadow-card' : 'text-muted-foreground',
                )}
              >
                <input
                  inputMode="decimal"
                  placeholder="Other"
                  aria-label="Custom slippage in percent"
                  value={customText}
                  onChange={(e) => {
                    const text = e.target.value.replace(/[^0-9.]/g, '')
                    setCustomText(text)
                    const bps = Math.round(Number(text) * 100)
                    if (bps > 0 && bps <= MAX_BPS) dispatch({ type: 'slippage', bps })
                  }}
                  className="w-full min-w-0 bg-transparent text-center outline-none placeholder:font-sans placeholder:text-xs"
                />
              </label>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              If the price moves more than this before your swap fills, the provider refunds you instead.
              {state.slippageBps > 300 ? (
                <span className="mt-1 block text-(--warning)">
                  High slippage: you may receive noticeably less.
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 border-border border-t pt-4">
            <span className="font-medium">Send to another address</span>
            {recipientAllowed ? (
              <>
                <input
                  value={state.recipient}
                  onChange={(e) => dispatch({ type: 'recipient', value: e.target.value })}
                  placeholder={`Your connected ${destination} wallet`}
                  aria-label={`Recipient on ${destination}`}
                  spellCheck={false}
                  autoComplete="off"
                  className={cn(
                    'h-11 w-full rounded-xl bg-muted px-3 font-mono text-sm outline-none focus:shadow-[inset_0_0_0_1.5px_var(--ring)]',
                    recipient && !recipient.ok && 'shadow-[inset_0_0_0_1.5px_var(--destructive)]',
                  )}
                />
                <p
                  className={cn(
                    'text-xs leading-relaxed',
                    recipient && !recipient.ok ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {recipient && !recipient.ok
                    ? recipient.error
                    : recipient?.ok
                      ? `Funds arrive at this ${destination} address, not your wallet.`
                      : `Optional. An address on ${destination}; leave it empty to use your wallet.`}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {pair.direction === 'local'
                  ? `${received} arrives in your connected Bitcoin Cash wallet: that wallet approves the Cauldron swap.`
                  : `${received} arrives in your connected Bitcoin Cash wallet: that wallet approves the Cauldron swap that turns the bridged BCH into ${received}.`}
              </p>
            )}
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  )
}
