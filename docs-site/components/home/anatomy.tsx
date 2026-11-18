"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

/**
 * The swap card, labelled: a real capture (light and dark, 2x) with numbered pins on the parts the docs explain,
 * and a key beside it. Pointing at a key line lifts its pin, and the other way round. Pin positions are measured on
 * the capture (1072 × 1394 px), as percentages.
 */
const PARTS = [
  {
    at: [62, 8.4],
    title: "Services, checked live",
    line: "NEAR Intents, THORChain halts, the Cauldron Router and the Bitcoin Cash network.",
    href: "/docs/guide/swap-screen",
  },
  { at: [94, 4.6], title: "Slippage and recipient", line: "Auto or your own; send to another address.", href: "/docs/guide/settings" },
  {
    at: [62.6, 21.7],
    title: "Any token, any chain",
    line: "Seventeen tokens on nine chains, with search, chain filters and balances.",
    href: "/docs/guide/tokens-and-pairs",
  },
  { at: [56.6, 33.8], title: "Turn it around", line: "Out of Bitcoin Cash is the same card, flipped.", href: "/docs/guide/swap-screen" },
  {
    at: [7.8, 68.7],
    title: "Every route, ranked",
    line: "By what you keep after the bridge, Cauldron and gas, with time, fees and approvals.",
    href: "/docs/guide/routes-list",
  },
  { at: [74.6, 64.4], title: "Best return, Fastest", line: "How each route is priced and compared.", href: "/docs/routes/pricing" },
  {
    at: [22, 90.2],
    title: "Your own two wallets",
    line: "WalletConnect for EVM and Solana, WizardConnect for Bitcoin Cash.",
    href: "/docs/guide/wallets",
  },
] as const

export function Anatomy({ caption }: { caption: string }) {
  const [on, setOn] = useState<number | null>(null)

  return (
    <div className="not-prose grid items-center gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
      <figure className="m-0">
        <div className="relative mx-auto max-w-[26rem]">
          {/* biome-ignore lint/performance/noImgElement: static export; the capture is pre-sized */}
          <img
            src="/shots/card/swap-light.webp"
            alt="Hashi's swap card: 50 USDC on Ethereum to 48.94 MUSD, NEAR Intents → Cauldron marked Best return with 1 approval, THORChain → Cauldron marked Fastest"
            width={1072}
            height={1394}
            loading="lazy"
            className="block h-auto w-full dark:hidden"
          />
          {/* biome-ignore lint/performance/noImgElement: static export; the capture is pre-sized */}
          <img
            src="/shots/card/swap-dark.webp"
            alt="Hashi's swap card in dark mode, the same quote"
            width={1072}
            height={1394}
            loading="lazy"
            className="hidden h-auto w-full dark:block"
          />
          {PARTS.map((p, i) => (
            <button
              key={p.title}
              type="button"
              aria-label={`${i + 1}: ${p.title}`}
              onMouseEnter={() => setOn(i)}
              onMouseLeave={() => setOn(null)}
              onFocus={() => setOn(i)}
              onBlur={() => setOn(null)}
              className={`absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-[11px] font-semibold ring-[3px] transition-transform duration-200 ${
                on === i
                  ? "scale-125 bg-[var(--vermilion)] text-white ring-[color-mix(in_oklab,var(--vermilion)_25%,transparent)]"
                  : "bg-fd-foreground text-fd-background ring-fd-background/80"
              }`}
              style={{ left: `${p.at[0]}%`, top: `${p.at[1]}%` }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <figcaption className="mt-3 text-center font-mono text-[11px] text-fd-muted-foreground">{caption}</figcaption>
      </figure>

      <ol className="flex flex-col">
        {PARTS.map((p, i) => (
          <li key={p.title} className="border-fd-border border-t last:border-b">
            <Link
              href={p.href}
              onMouseEnter={() => setOn(i)}
              onMouseLeave={() => setOn(null)}
              onFocus={() => setOn(i)}
              onBlur={() => setOn(null)}
              className="group grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-3 py-3.5"
            >
              <span
                className={`font-mono text-[13px] tabular-nums transition-colors ${on === i ? "text-[var(--vermilion-text)]" : "text-fd-muted-foreground"}`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[16px] font-medium">{p.title}</span>
                <span className="text-[14px] text-fd-muted-foreground">{p.line}</span>
              </span>
              <ArrowRight
                className="size-4 self-center text-fd-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
