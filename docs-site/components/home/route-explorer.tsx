"use client"

import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Logo } from "@/components/logo-cloud"
import {
  BCH_TOKENS,
  type BchToken,
  CHAINS,
  type Carrier,
  type Chain,
  type Direction,
  explain,
  NAMES,
  type Stable,
  swapQuery,
} from "@/lib/coverage"
import { SITE } from "@/lib/site"

const MARK: Record<Carrier, string> = { near: "near", thorchain: "thorchain", cauldron: "cauldron.png" }

/** "BCH" stands in for Bitcoin Cash on a phone, where the three full names do not fit one row. */
const DIRECTIONS: { id: Direction; label: string; short: string }[] = [
  { id: "in", label: "Into Bitcoin Cash", short: "Into BCH" },
  { id: "out", label: "Out of Bitcoin Cash", short: "Out of BCH" },
  { id: "local", label: "On Bitcoin Cash", short: "On BCH" },
]

/** The page that walks through each kind of swap. */
const READ: Record<Direction, string> = {
  in: "/docs/routes#into-bitcoin-cash",
  out: "/docs/routes#out-of-bitcoin-cash",
  local: "/docs/guide/on-bitcoin-cash",
}

/*
 * The bridge: the arch of Hashi's mark (a drum bridge, 橋) drawn wide, on an 800 × 300 board. The carriers sit on
 * the arch at fixed points along the curve, so the same cubic is evaluated here to place them.
 */
const W = 800
const H = 300
const A = { x0: 56, y0: 252, c1x: 180, c1y: 6, c2x: 620, c2y: 6, x1: 744, y1: 252 }
const PATH = `M${A.x0} ${A.y0}C${A.c1x} ${A.c1y} ${A.c2x} ${A.c2y} ${A.x1} ${A.y1}`
function onArch(t: number) {
  const u = 1 - t
  const x = u ** 3 * A.x0 + 3 * u * u * t * A.c1x + 3 * u * t * t * A.c2x + t ** 3 * A.x1
  const y = u ** 3 * A.y0 + 3 * u * u * t * A.c1y + 3 * u * t * t * A.c2y + t ** 3 * A.y1
  return { x, y }
}
const pct = (p: { x: number; y: number }) => ({ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` })
const POSTS = [0.16, 0.3, 0.5, 0.7, 0.84].map(onArch)
const WATER = 276

/**
 * The docs' front door: pick where your dollars are and where they need to go, and the bridge lights the real
 * route: who carries it, in which order, and what each wallet will be asked. Every fact comes from the app's own
 * coverage and approval rules (lib/coverage.ts), and "Open this swap" opens the same pair in Hashi.
 */
export function RouteExplorer() {
  const [direction, setDirection] = useState<Direction>("in")
  const [chain, setChain] = useState<Chain>("base")
  const [stable, setStable] = useState<Stable>("USDC")
  const [bch, setBch] = useState<BchToken>("PUSD")
  const [bchFrom, setBchFrom] = useState<BchToken>("PUSD")
  const [bchTo, setBchTo] = useState<BchToken>("MUSD")
  const [pick, setPick] = useState(0)

  const local = direction === "local"
  const fromToken: BchToken = local ? bchFrom : bch
  const toToken: BchToken = local ? bchTo : bch
  const facts = useMemo(
    () => explain(direction, chain, stable, fromToken, toToken),
    [direction, chain, stable, fromToken, toToken],
  )
  const route = facts.routes[Math.min(pick, facts.routes.length - 1)]
  const chainInfo = CHAINS.find((c) => c.id === chain)
  const stableEnd = { logo: stable.toLowerCase(), badge: chainInfo?.logo, label: `${stable} on ${chainInfo?.name ?? chain}` }
  const tokenEnd = (t: BchToken) => {
    const info = BCH_TOKENS.find((x) => x.id === t)
    return {
      logo: info?.logo ?? "bch",
      badge: t === "BCH" ? undefined : "bch",
      label: t === "BCH" ? "BCH" : `${t} on Bitcoin Cash`,
    }
  }
  const start = direction === "in" ? stableEnd : tokenEnd(fromToken)
  const end = direction === "out" ? stableEnd : tokenEnd(toToken)
  const lit = `${direction}-${chain}-${stable}-${fromToken}-${toToken}-${pick}`

  const chooseChain = (id: Chain) => {
    setChain(id)
    const has = CHAINS.find((c) => c.id === id)?.stables ?? []
    if (!has.includes(stable)) setStable(has[0] ?? "USDC")
    setPick(0)
  }

  const stablesBank = (label: string) => (
    <div className="flex flex-col gap-2">
      <p className="label-mono">{label}</p>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
        {CHAINS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => chooseChain(c.id)}
            aria-pressed={chain === c.id}
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[14px] transition-colors ${
              chain === c.id ? "bg-fd-foreground text-fd-background" : "hover:bg-fd-muted"
            }`}
          >
            <Logo name={c.logo} size={18} className="rounded-full" />
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {(chainInfo?.stables ?? []).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStable(s)
              setPick(0)
            }}
            aria-pressed={stable === s}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[12px] ring-1 transition-colors ${
              stable === s ? "bg-fd-foreground text-fd-background ring-fd-foreground" : "ring-fd-border hover:bg-fd-muted"
            }`}
          >
            <Logo name={s.toLowerCase()} size={14} className="rounded-full" />
            {s}
          </button>
        ))}
      </div>
    </div>
  )

  const tokensBank = (label: string, value: BchToken, set: (t: BchToken) => void, taken?: BchToken) => (
    <div className="flex flex-col gap-2">
      <p className="label-mono">{label}</p>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-1">
        {BCH_TOKENS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              set(t.id)
              setPick(0)
            }}
            aria-pressed={value === t.id}
            disabled={taken === t.id}
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
              value === t.id ? "bg-fd-foreground text-fd-background" : "hover:bg-fd-muted"
            }`}
          >
            <Logo name={t.logo} size={18} className="rounded-full" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-medium">{t.id}</span>
              <span
                className={`hidden truncate text-[11px] sm:block ${value === t.id ? "opacity-70" : "text-fd-muted-foreground"}`}
              >
                {t.name}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  const legs = route?.legs ?? []
  const spots = (legs.length === 1 ? [0.5] : [0.32, 0.68]).map(onArch)
  const ends = [
    { end: start, at: { x: A.x0, y: A.y0 } },
    { end, at: { x: A.x1, y: A.y1 } },
  ]

  return (
    <div className="not-prose w-full rounded-[2rem] border border-fd-border bg-fd-card p-4 shadow-[0_1px_0_rgb(18_17_17/0.03),0_40px_80px_-56px_rgb(18_17_17/0.5)] sm:p-6">
      <div role="tablist" aria-label="Which way" className="flex gap-1 overflow-x-auto rounded-full bg-fd-muted p-1">
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            role="tab"
            type="button"
            aria-selected={direction === d.id}
            onClick={() => {
              setDirection(d.id)
              setPick(0)
            }}
            className={`flex-1 rounded-full px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors sm:text-[14px] ${
              direction === d.id
                ? "bg-fd-card text-fd-foreground shadow-sm"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            }`}
          >
            <span className="sm:hidden">{d.short}</span>
            <span className="hidden sm:inline">{d.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-[10.5rem_1fr_10.5rem] sm:items-center lg:grid-cols-[11.5rem_1fr_11.5rem]">
        {direction === "in"
          ? stablesBank("/ From")
          : tokensBank("/ From", fromToken, local ? setBchFrom : setBch, local ? bchTo : undefined)}

        {/* The bridge */}
        <figure className="order-first m-0 pt-9 sm:order-none sm:pt-6" aria-label={`${start.label} to ${end.label}`}>
          <div className="relative aspect-[800/300] w-full">
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <path d={`M8 ${WATER}H${W - 8}`} className="stroke-fd-border" strokeWidth="3" strokeLinecap="round" />
              <path
                d={`M120 ${WATER + 12}H300M520 ${WATER + 12}H680`}
                className="stroke-fd-border"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              />
              {POSTS.map((p) => (
                <path
                  key={p.x}
                  d={`M${p.x} ${p.y + 8}V${WATER - 2}`}
                  className="stroke-fd-border"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              ))}
              <path d={PATH} fill="none" className="stroke-fd-border" strokeWidth="12" strokeLinecap="round" />
              {route ? (
                <>
                  <path
                    key={lit}
                    d={PATH}
                    fill="none"
                    stroke="var(--vermilion)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray="1"
                    className="motion-safe:animate-[draw-arch_0.9s_cubic-bezier(0.22,1,0.36,1)_both]"
                  />
                  <circle r="5" className="fill-fd-card motion-reduce:hidden">
                    <animateMotion dur="3.2s" repeatCount="indefinite" path={PATH} />
                  </circle>
                </>
              ) : null}
            </svg>

            {ends.map(({ end: e, at }, i) => (
              <span
                key={i === 0 ? "start" : "end"}
                className="absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-fd-card shadow-[0_8px_20px_-10px_rgb(0_0_0/0.45)] ring-1 ring-fd-border sm:size-12"
                style={pct(at)}
              >
                <Logo name={e.logo} size={26} className="rounded-full" />
                {e.badge ? (
                  <span className="absolute -right-0.5 -bottom-0.5 flex size-[18px] items-center justify-center rounded-full bg-fd-card ring-1 ring-fd-border">
                    <Logo name={e.badge} size={12} className="rounded-full" />
                  </span>
                ) : null}
              </span>
            ))}

            {legs.map((leg, i) => (
              <span
                key={`${lit}-${leg}`}
                className="absolute flex -translate-x-1/2 -translate-y-[calc(100%+12px)] items-center gap-1.5 rounded-full bg-fd-card py-1 pr-3 pl-1 text-[12px] font-medium whitespace-nowrap shadow-[0_6px_18px_-8px_rgb(0_0_0/0.35)] ring-1 ring-fd-border motion-safe:animate-[rise_0.5s_cubic-bezier(0.22,1,0.36,1)_both] sm:text-[13px]"
                style={{ ...pct(spots[i] ?? spots[0]), animationDelay: `${0.15 + i * 0.25}s` }}
              >
                <Logo name={MARK[leg]} size={20} className="rounded-full" />
                {NAMES[leg]}
              </span>
            ))}
          </div>
          <figcaption className="mt-3 flex items-center justify-between gap-2 font-mono text-[11px] text-fd-muted-foreground sm:text-[12px]">
            <span className="truncate">{start.label}</span>
            <ArrowRight className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate text-right">{end.label}</span>
          </figcaption>
        </figure>

        {direction === "out"
          ? stablesBank("/ To")
          : tokensBank("/ To", toToken, local ? setBchTo : setBch, local ? bchFrom : undefined)}
      </div>

      {/* What it asks of you */}
      <div className="mt-6 grid gap-5 border-fd-border border-t pt-5 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex flex-col gap-3">
          {facts.routes.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="label-mono mr-1">/ {facts.routes.length} routes</span>
              {facts.routes.map((r, i) => (
                <button
                  key={r.legs.join("-")}
                  type="button"
                  onClick={() => setPick(i)}
                  aria-pressed={pick === i}
                  className={`rounded-full px-3 py-1 text-[13px] ring-1 transition-colors ${
                    pick === i ? "bg-fd-foreground text-fd-background ring-fd-foreground" : "ring-fd-border hover:bg-fd-muted"
                  }`}
                >
                  {r.legs.map((l) => NAMES[l]).join(" → ")}
                </button>
              ))}
            </div>
          ) : null}
          {route ? (
            <ul className="flex flex-col gap-1.5 text-[15px]">
              {route.approvals.map((a) => (
                <li key={a.wallet} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-[13px] font-medium tabular-nums">
                    {a.count} {a.count === 1 ? "approval" : "approvals"}
                  </span>
                  <span>in your {a.wallet}</span>
                  {a.note ? <span className="text-fd-muted-foreground">· {a.note}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-fd-muted-foreground">Pick two different tokens.</p>
          )}
          {facts.missing.map((m) => (
            <p key={m.carrier} className="text-[13px] text-fd-muted-foreground">
              {NAMES[m.carrier]} isn’t offered for this pair: {m.why}.
            </p>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={READ[direction]}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium ring-1 ring-fd-border hover:bg-fd-muted"
          >
            How it runs <ArrowRight className="size-4" aria-hidden />
          </Link>
          {route ? (
            <a
              href={`${SITE.swap}?${swapQuery(direction, chain, stable, fromToken, toToken)}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-fd-foreground px-4 text-[14px] font-semibold text-fd-background"
            >
              Open this swap <ArrowUpRight className="size-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
