import { Clock, Fuel, PenLine, Zap } from "lucide-react"
import { Fragment, type ReactNode } from "react"
import { Logo } from "./logo-cloud"

/*
 * A real quote, drawn the way the app's route list draws it (apps/web/features/swap/route-list.tsx): the carrier's
 * mark, its legs in order ("NEAR Intents → Cauldron"), the pills, time, fees in dollars and approvals, and what
 * arrives after every fee. The numbers are copied from a live quote, with the moment they were read.
 */

const NAMES = { near: "NEAR Intents", thorchain: "THORChain", cauldron: "Cauldron" } as const
const MARKS = { near: "near", thorchain: "thorchain", cauldron: "cauldron.png" } as const
type Carrier = keyof typeof NAMES

export function RouteCard({
  legs,
  amount,
  symbol,
  eta,
  fees,
  approvals,
  best = false,
  fastest = false,
  paused,
}: {
  /** In the order the money meets them; the first is the route's own carrier unless it is Cauldron. */
  legs: Carrier[]
  amount?: string
  symbol?: string
  eta?: string
  fees?: string
  approvals?: number
  best?: boolean
  fastest?: boolean
  /** A route that cannot run right now, with the app's reason. */
  paused?: string
}) {
  const carrier = legs.find((l) => l !== "cauldron") ?? "cauldron"
  const local = legs.length === 1 && legs[0] === "cauldron"
  return (
    <div
      className={`not-prose flex items-center gap-3 rounded-[1.25rem] px-3.5 py-3 ${
        paused
          ? "border border-dashed border-fd-border"
          : best
            ? "bg-fd-muted shadow-[inset_0_0_0_1.5px_var(--color-fd-foreground)]"
            : "border border-fd-border"
      }`}
    >
      <span className={`relative shrink-0 ${paused ? "opacity-50 grayscale" : ""}`}>
        <Logo name={MARKS[carrier]} size={paused ? 26 : 34} className="rounded-full" />
        {!local && legs.includes("cauldron") && !paused ? (
          <span className="absolute -right-1 -bottom-1 flex rounded-full bg-fd-card p-px ring-2 ring-fd-card">
            <Logo name="cauldron.png" size={15} className="rounded-full" />
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] font-medium">
          {legs.map((leg, i) => (
            <Fragment key={leg}>
              {i > 0 ? <span className="text-fd-muted-foreground">→</span> : null}
              <span className={leg === carrier ? "" : "text-fd-muted-foreground"}>{NAMES[leg]}</span>
            </Fragment>
          ))}
          {local ? <span className="text-fd-muted-foreground">· no bridge</span> : null}
          {best ? <Pill tone="vermilion" icon={<Zap className="size-3" />}>Best return</Pill> : null}
          {fastest ? <Pill tone="ink" icon={<Clock className="size-3" />}>Fastest</Pill> : null}
          {paused ? <Pill tone="warning">Paused</Pill> : null}
        </span>
        {paused ? (
          <span className="mt-0.5 block text-xs text-fd-muted-foreground">{paused}</span>
        ) : (
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fd-muted-foreground">
            {eta ? (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {eta}
              </span>
            ) : null}
            {fees ? (
              <span className="flex items-center gap-1">
                <Fuel className="size-3.5" />
                {fees} in fees
              </span>
            ) : null}
            {approvals ? (
              <span className="flex items-center gap-1">
                <PenLine className="size-3.5" />
                {approvals} {approvals === 1 ? "approval" : "approvals"}
              </span>
            ) : null}
          </span>
        )}
      </span>
      {amount && !paused ? (
        <span className="shrink-0 text-right">
          <span className="block font-mono text-[1.0625rem]">{amount}</span>
          <span className="block text-xs text-fd-muted-foreground">{symbol}</span>
        </span>
      ) : null}
    </div>
  )
}

function Pill({ tone, icon, children }: { tone: "vermilion" | "ink" | "warning"; icon?: ReactNode; children: ReactNode }) {
  const fill = {
    vermilion: "bg-[linear-gradient(225deg,#ff5a2a,#ff2f00)] text-white",
    ink: "bg-fd-foreground text-fd-background",
    warning: "bg-[linear-gradient(225deg,#fdc830,#f37335)] text-white",
  }[tone]
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${fill}`}>
      {icon}
      {children}
    </span>
  )
}

/** A set of routes for one pair and amount, headed by what was asked and when (UTC). */
export function Quote({ ask, at, children }: { ask: string; at: string; children: ReactNode }) {
  return (
    <figure className="not-prose my-6 flex flex-col gap-2 rounded-[1.6rem] border border-fd-border bg-fd-card p-2.5">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
        <span className="label-mono">/ Routes · {ask}</span>
        <span className="font-mono text-[11px] text-fd-muted-foreground">live quote · {at}</span>
      </figcaption>
      {children}
    </figure>
  )
}
