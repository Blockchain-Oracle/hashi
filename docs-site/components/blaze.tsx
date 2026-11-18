"use client"

import { Popover } from "@base-ui/react/popover"
import { Banner } from "fumadocs-ui/components/banner"
import { Check, Copy, QrCode } from "lucide-react"
import { useState } from "react"
import { BLAZE, SITE } from "@/lib/site"

const bare = BLAZE.cashtokens.replace(/^bitcoincash:/, "")
const short = `${bare.slice(0, 8)}…${bare.slice(-6)}`
const link = "whitespace-nowrap underline decoration-white/30 underline-offset-4 hover:decoration-white"

/**
 * Hashi's CashTokens address, one look from a code to scan: a vermilion arch over the label (the bridge Hashi is
 * named for), the QR code, the address in full and a copy button. The same card as the app's banner; `framed` gives
 * it its own border on a docs page.
 */
export function CashTokensCard({ framed = false }: { framed?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(BLAZE.cashtokens)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div
      className={`not-prose relative flex flex-col items-center gap-4 overflow-hidden px-5 pt-9 pb-5 ${
        framed ? "mx-auto my-6 max-w-80 rounded-2xl border bg-fd-card shadow-sm" : ""
      }`}
    >
      {/* The arch rises over the label and lands on its deck line, above the code. */}
      <svg viewBox="0 0 320 72" className="absolute inset-x-0 top-0 w-full" aria-hidden>
        <path d="M12 68C66 2 254 2 308 68" fill="none" stroke="var(--vermilion)" strokeWidth="5" strokeLinecap="round" />
        <path d="M4 70H316" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="label-mono relative mb-2">/ Scan to send to Hashi</p>
      <div className="relative rounded-[1.25rem] bg-white p-2 shadow-sm ring-1 ring-black/5">
        <img src={BLAZE.qr} alt={`QR code for ${BLAZE.cashtokens}`} width={220} height={220} className="block" />
      </div>
      <p className="max-w-full break-all text-center font-mono text-xs leading-relaxed">
        <span className="text-fd-muted-foreground">bitcoincash:</span>
        {bare}
      </p>
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-2 rounded-full bg-fd-muted px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-fd-accent"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy address"}
      </button>
      <p className="text-balance text-center text-xs leading-relaxed text-fd-muted-foreground">
        BCH BLAZE sends prizes here, and EMBER2026 holders vote for Hashi by sending their tokens here. Scan it with
        Paytaca, Selene or Cashonize.
      </p>
    </div>
  )
}

/**
 * The strip every BCH BLAZE entry carries, here above every docs page as on the app's home: the bounty, the Widget
 * Factory deck, the source and the CashTokens address with its QR code. No close button: it is the entry's banner.
 * Fumadocs' Banner sets --fd-banner-height, so the sticky nav below it sits clear.
 */
export function BlazeBanner() {
  return (
    <Banner
      height="2.25rem"
      className="gap-x-3.5 border-b border-white/10 bg-[#121111] px-3 text-xs font-normal text-[#fffaf5] sm:gap-x-5"
    >
      <a
        href={BLAZE.bountyUrl}
        className="whitespace-nowrap font-mono uppercase tracking-[0.08em] text-[#fffaf5]/70 transition-colors hover:text-[#fffaf5]"
      >
        <span className="sm:hidden">BCH BLAZE</span>
        <span className="hidden sm:inline">
          {BLAZE.event} · {BLAZE.bounty}
        </span>
      </a>
      <a href={BLAZE.deck} className={link}>
        <span className="sm:hidden">Deck</span>
        <span className="hidden sm:inline">Widget Factory deck</span> ↗
      </a>
      <a href={SITE.repo} className={link}>
        <span className="sm:hidden">Code</span>
        <span className="hidden sm:inline">Source code</span> ↗
      </a>
      {/* Base UI's popover itself (Fumadocs' wrapper has no collision padding): the card keeps the page's 16 px
          gutter on a phone, as in the app. */}
      <Popover.Root>
        <Popover.Trigger
          className="group flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pr-2 pl-1.5 transition-colors hover:bg-white/10 focus-visible:bg-white/10"
          aria-label="Show the CashTokens address as a QR code"
        >
          <QrCode className="size-3.5" />
          <span className="text-[#fffaf5]/70">CashTokens</span>
          <span className="hidden font-mono underline decoration-white/30 underline-offset-4 group-hover:decoration-white sm:inline">
            {short}
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={16} className="z-50">
            <Popover.Popup className="w-[min(20rem,calc(100vw-2rem))] origin-(--transform-origin) overflow-y-auto max-h-(--available-height) rounded-xl border bg-fd-popover text-left text-fd-popover-foreground shadow-lg focus-visible:outline-none data-closed:animate-fd-popover-out data-open:animate-fd-popover-in">
              <CashTokensCard />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </Banner>
  )
}
