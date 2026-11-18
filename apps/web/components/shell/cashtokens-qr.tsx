'use client'

import { Copy01Icon, QrCodeIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { type ReactNode, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { shortAddress } from '@/lib/format'

/**
 * The banner's CashTokens address, one tap from a code to scan: a card with the QR (drawn on the server and passed
 * in, so the encoder never ships to the browser), the address in full, and a copy button. A vermilion arch spans
 * the card above the code, the bridge Hashi is named for.
 */
export function CashTokensQr({ address, qr }: { address: string; qr: ReactNode }) {
  const bare = address.replace(/^bitcoincash:/, '')
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <span className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger
          className="group flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-1.5 transition-colors hover:bg-white/10 focus-visible:bg-white/10"
          aria-label="Show the CashTokens address as a QR code"
        >
          <Icon icon={QrCodeIcon} size={14} />
          <span className="text-[#fffaf5]/70">CashTokens</span>
          <span className="font-mono underline decoration-white/30 underline-offset-4 group-hover:decoration-white">
            {shortAddress(bare, 8, 6)}
          </span>
        </PopoverTrigger>
        <PopoverPopup align="center" collisionPadding={16} className="w-[min(20rem,calc(100vw-2rem))] p-0">
          <div className="relative flex flex-col items-center gap-4 overflow-hidden px-5 pt-9 pb-5">
            {/* The arch rises over the label and lands on its deck line, above the code. */}
            <svg viewBox="0 0 320 72" className="absolute inset-x-0 top-0 w-full" aria-hidden>
              <path
                d="M12 68C66 2 254 2 308 68"
                fill="none"
                stroke="var(--vermilion)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M4 70H316"
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p className="label-mono relative mb-2">/ Scan to send to Hashi</p>
            <div className="relative rounded-[1.25rem] bg-white p-2 shadow-card ring-1 ring-black/5">
              {qr}
            </div>
            <p className="max-w-full break-all text-center font-mono text-xs leading-relaxed">
              <span className="text-muted-foreground">bitcoincash:</span>
              {bare}
            </p>
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 font-medium text-sm transition-colors hover:bg-accent"
            >
              <Icon icon={copied ? Tick02Icon : Copy01Icon} size={16} />
              {copied ? 'Copied' : 'Copy address'}
            </button>
            <p className="text-balance text-center text-muted-foreground text-xs leading-relaxed">
              BCH BLAZE prizes are sent here, and EMBER2026 holders vote for Hashi by sending their tokens
              here. Scan it with Paytaca, Selene or Cashonize.
            </p>
          </div>
        </PopoverPopup>
      </Popover>
    </span>
  )
}
