import type { ReactNode } from "react"

/*
 * The pieces Hashi's figures are drawn from: a dot grid with its FIG caption, the drum-bridge arch of Hashi's mark,
 * coins wearing the real token logos, chips for services and wallets, the swap contract as a lock, and paths that
 * carry a few words. Colours come from the page's tokens, so the same figure is right in light and in dark.
 */

export type Pt = { x: number; y: number }

export function Ground({ id, w, h, caption, k = 1 }: { id: string; w: number; h: number; caption: string; k?: number }) {
  return (
    <>
      <defs>
        <pattern id={`${id}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1.1" fill="var(--line)" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}-dots)`} />
      <text x="26" y="40" fontSize={12 * k} className="font-mono" letterSpacing="0.14em" fill="var(--text-2)">
        {caption.toUpperCase()}
      </text>
    </>
  )
}

/** A label in the figure's small mono caps. */
export function Caps({
  at,
  children,
  anchor = "middle",
  k = 1,
  tone = "muted",
}: {
  at: Pt
  children: string
  anchor?: "start" | "middle" | "end"
  k?: number
  tone?: "muted" | "ink" | "you"
}) {
  const fill = tone === "ink" ? "var(--ink)" : tone === "you" ? "var(--vermilion)" : "var(--text-2)"
  return (
    <text x={at.x} y={at.y} textAnchor={anchor} fontSize={13 * k} className="font-mono" letterSpacing="0.12em" fill={fill}>
      {children.toUpperCase()}
    </text>
  )
}

/** A logo in a round coin; `badge` adds the chain it lives on, small at the corner. */
export function Coin({ at, logo, badge, r = 18 }: { at?: Pt; logo: string; badge?: string; r?: number }) {
  const p = at ?? { x: 0, y: 0 }
  const size = r * 1.35
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={r} fill="var(--card)" stroke="var(--line)" strokeWidth="1.5" />
      <image href={`/logos/${logo}`} x={p.x - size / 2} y={p.y - size / 2} width={size} height={size} />
      {badge ? (
        <g>
          <circle cx={p.x + r * 0.72} cy={p.y + r * 0.72} r={r * 0.42} fill="var(--card)" stroke="var(--line)" strokeWidth="1.2" />
          <image href={`/logos/${badge}`} x={p.x + r * 0.72 - r * 0.3} y={p.y + r * 0.72 - r * 0.3} width={r * 0.6} height={r * 0.6} />
        </g>
      ) : null}
    </g>
  )
}

/** A service or wallet: a rounded chip with its logo and name. */
export function Chip({
  at,
  label,
  logo,
  badge,
  w = 190,
  tone = "ink",
  icon,
  k = 1,
}: {
  at: Pt
  label: string
  logo?: string
  badge?: string
  w?: number
  tone?: "ink" | "you"
  /** A drawn mark instead of a logo file (Hashi's own, a key), centred where the coin would be. */
  icon?: (c: Pt) => ReactNode
  k?: number
}) {
  const h = 58
  return (
    <g>
      <rect
        x={at.x - w / 2}
        y={at.y - h / 2}
        width={w}
        height={h}
        rx="16"
        fill="var(--card)"
        stroke={tone === "you" ? "var(--vermilion)" : "var(--line)"}
        strokeWidth={tone === "you" ? 2.2 : 1.5}
      />
      {logo ? <Coin at={{ x: at.x - w / 2 + 29, y: at.y }} logo={logo} badge={badge} r={17} /> : null}
      {icon ? icon({ x: at.x - w / 2 + 29, y: at.y }) : null}
      <text
        x={logo || icon ? at.x - w / 2 + 56 : at.x}
        y={at.y + 5 * k}
        textAnchor={logo || icon ? "start" : "middle"}
        fontSize={17 * k}
        className="font-medium"
        fill="var(--ink)"
      >
        {label}
      </text>
    </g>
  )
}

/** The swap contract: a lock that opens only to pay you. */
export function Lock({ at, w = 118, h = 90, k = 1 }: { at: Pt; w?: number; h?: number; k?: number }) {
  const top = at.y - h / 2
  return (
    <g>
      <path
        d={`M${at.x - 24} ${top + 2}v-14a24 24 0 0 1 48 0v14`}
        fill="none"
        stroke="var(--vermilion)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect x={at.x - w / 2} y={top} width={w} height={h} rx="20" fill="var(--card)" stroke="var(--vermilion)" strokeWidth="2.5" />
      <circle cx={at.x} cy={at.y - 8} r="8" fill="var(--vermilion)" />
      <path d={`M${at.x} ${at.y - 4}v18`} stroke="var(--vermilion)" strokeWidth="5" strokeLinecap="round" />
      <Caps at={{ x: at.x, y: top + h + 24 }} k={k} tone="ink">
        swap contract
      </Caps>
    </g>
  )
}

/** A path with a few words beside it. */
export function Path({
  d,
  tone = "ink",
  dashed = false,
  width = 2,
  arrow = false,
}: {
  d: string
  tone?: "ink" | "you" | "muted"
  dashed?: boolean
  width?: number
  arrow?: boolean
}) {
  const color = { ink: "var(--ink)", you: "var(--vermilion)", muted: "var(--text-2)" }[tone]
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dashed ? "6 7" : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      markerEnd={arrow ? `url(#arrow-${tone})` : undefined}
    />
  )
}

/** Arrowheads for each tone; put once in a figure's <svg>. */
export function Arrows() {
  return (
    <defs>
      {(["ink", "you", "muted"] as const).map((tone) => (
        <marker key={tone} id={`arrow-${tone}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path
            d="M1 1L9 5L1 9"
            fill="none"
            stroke={{ ink: "var(--ink)", you: "var(--vermilion)", muted: "var(--text-2)" }[tone]}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      ))}
    </defs>
  )
}

/** A numbered step: the vermilion dot and its few words. */
export function Step({ at, n, children, anchor = "start", k = 1 }: { at: Pt; n: number; children: string; anchor?: "start" | "middle" | "end"; k?: number }) {
  const dx = anchor === "start" ? 20 : anchor === "end" ? -20 : 0
  return (
    <g>
      <circle cx={at.x} cy={at.y} r={11 * k} fill="var(--vermilion)" />
      <text x={at.x} y={at.y + 4.5 * k} textAnchor="middle" fontSize={12.5 * k} className="font-mono font-semibold" fill="#fff">
        {n}
      </text>
      <text x={at.x + dx * k} y={at.y + 5 * k} textAnchor={anchor} fontSize={14.5 * k} fill="var(--ink)">
        {children}
      </text>
    </g>
  )
}

/**
 * One coin's part of a looping journey. `stops` are [moment, place] pairs: the moment as a fraction of the loop, the
 * place as a fraction of `d`. The coin holds still between two stops at the same place (a wait) and shows only during
 * `show`. Several coins on one loop make one continuous trip (SMIL, so it runs inside an exported SVG too).
 */
export function Leg({
  d,
  loop,
  stops,
  show,
  children,
}: {
  d: string
  loop: number
  stops: [number, number][]
  show: [number, number]
  children: ReactNode
}) {
  const first = stops[0] ?? [0, 0]
  const last = stops[stops.length - 1] ?? [1, 1]
  const times = [0, ...stops.map(([t]) => t), 1].map((t) => t.toFixed(4)).join(";")
  const points = [first[1], ...stops.map(([, p]) => p), last[1]].map((p) => p.toFixed(4)).join(";")
  return (
    <g opacity="0" className="motion-reduce:hidden">
      <animateMotion dur={`${loop}s`} repeatCount="indefinite" path={d} keyPoints={points} keyTimes={times} calcMode="linear" />
      <animate
        attributeName="opacity"
        dur={`${loop}s`}
        repeatCount="indefinite"
        values="0;1;0"
        keyTimes={`0;${show[0].toFixed(4)};${show[1].toFixed(4)}`}
        calcMode="discrete"
      />
      {children}
    </g>
  )
}

/** The drum-bridge arch of Hashi's mark between two feet: controls a sixth in from each end, rising 0.29 of the span. */
export function archPath(x0: number, x1: number, y: number) {
  const span = x1 - x0
  const lift = span * 0.39
  return `M${x0} ${y}C${x0 + span / 6} ${y - lift} ${x1 - span / 6} ${y - lift} ${x1} ${y}`
}

/** A point on that arch, t from 0 to 1. */
export function onArch(x0: number, x1: number, y: number, t: number): Pt {
  const span = x1 - x0
  const lift = span * 0.39
  const [c1x, c2x, cy] = [x0 + span / 6, x1 - span / 6, y - lift]
  const u = 1 - t
  return {
    x: u ** 3 * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * x1,
    y: u ** 3 * y + 3 * u * u * t * cy + 3 * u * t * t * cy + t ** 3 * y,
  }
}

/** The bridge itself: water, posts and the arch lit vermilion, with a carrier's chip riding on top. */
export function Bridge({ x0, x1, y, water, carrier, logo, k = 1 }: { x0: number; x1: number; y: number; water: number; carrier?: string; logo?: string; k?: number }) {
  const d = archPath(x0, x1, y)
  const apex = onArch(x0, x1, y, 0.5)
  const span = x1 - x0
  return (
    <g>
      <path d={`M${x0 - 30} ${water}H${x1 + 30}`} stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
      <path d={`M${x0 + span * 0.1} ${water + 14}H${x0 + span * 0.42}M${x0 + span * 0.6} ${water + 14}H${x0 + span * 0.88}`} stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      {[0.14, 0.3, 0.7, 0.86].map((t) => {
        const p = onArch(x0, x1, y, t)
        return <path key={t} d={`M${p.x} ${p.y + 8}V${water - 2}`} stroke="var(--line)" strokeWidth="4" strokeLinecap="round" />
      })}
      <path d={d} fill="none" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--vermilion)" strokeWidth="5" strokeLinecap="round" />
      {carrier ? (
        <>
          <path d={`M${apex.x} ${apex.y - 9}V${apex.y - 26}`} stroke="var(--line)" strokeWidth="2" />
          <Chip at={{ x: apex.x, y: apex.y - 54 }} label={carrier} logo={logo} w={Math.max(150, carrier.length * 10 + 80)} k={k} />
        </>
      ) : null}
    </g>
  )
}

/** A step number sitting on a path. */
export function Dot({ at, n, k = 1 }: { at: Pt; n: number; k?: number }) {
  return (
    <g>
      <circle cx={at.x} cy={at.y} r={13 * k} fill="var(--paper)" />
      <circle cx={at.x} cy={at.y} r={11 * k} fill="var(--vermilion)" />
      <text x={at.x} y={at.y + 4.5 * k} textAnchor="middle" fontSize={12.5 * k} className="font-mono font-semibold" fill="#fff">
        {n}
      </text>
    </g>
  )
}

/** A Bitcoin Cash block: a small square that turns green when the coin reaches it, once per loop. */
export function Block({ at, n, loop, lit, k = 1 }: { at: Pt; n: number; loop: number; lit: [number, number]; k?: number }) {
  const s = 30 * k
  return (
    <g>
      <rect x={at.x - s / 2} y={at.y - s / 2} width={s} height={s} rx={7 * k} fill="var(--card)" stroke="var(--ink)" strokeWidth="1.8" />
      <rect x={at.x - s / 2} y={at.y - s / 2} width={s} height={s} rx={7 * k} fill="var(--success)" opacity="0">
        <animate attributeName="opacity" dur={`${loop}s`} repeatCount="indefinite" values="0;1;0" keyTimes={`0;${lit[0].toFixed(4)};${lit[1].toFixed(4)}`} calcMode="discrete" />
      </rect>
      <text x={at.x} y={at.y + 5 * k} textAnchor="middle" fontSize={13 * k} className="font-mono font-semibold" fill="var(--ink)">
        {n}
      </text>
    </g>
  )
}

/** A dashed area: a group of parts that belong together (your browser, Hashi's server). */
export function Area({ x, y, w, h, label, dashed = false, tint = false, k = 1 }: { x: number; y: number; w: number; h: number; label: string; dashed?: boolean; tint?: boolean; k?: number }) {
  return (
    <g>
      {tint ? <rect x={x} y={y} width={w} height={h} rx="26" fill="var(--chip)" opacity="0.55" /> : null}
      <rect x={x} y={y} width={w} height={h} rx="26" fill="none" stroke="var(--line)" strokeWidth="1.5" strokeDasharray={dashed ? "6 6" : undefined} />
      <Caps at={{ x: x + 24, y: y + 34 }} anchor="start" k={k}>
        {label}
      </Caps>
    </g>
  )
}

/** Hashi's mark: the vermilion tile with the drum bridge. */
export function HashiTile({ c, size = 34 }: { c: Pt; size?: number }) {
  const k = size / 24
  return (
    <g transform={`translate(${c.x - size / 2} ${c.y - size / 2})`}>
      <rect width={size} height={size} rx={size * 0.3} fill="var(--vermilion)" />
      <g transform={`scale(${k})`} fill="none" stroke="#fff" strokeLinecap="round">
        <path d="M3 15.5C6 8.5 18 8.5 21 15.5" strokeWidth="2.4" />
        <path d="M8 11.2v4.3M12 9.9v5.6M16 11.2v4.3" strokeWidth="1.6" opacity="0.85" />
        <path d="M2.5 19.5h19" strokeWidth="2" opacity="0.7" />
      </g>
    </g>
  )
}

/** A key: the swap's own trade key, made in your browser. */
export function KeyTile({ c, size = 34 }: { c: Pt; size?: number }) {
  return (
    <g>
      <circle cx={c.x} cy={c.y} r={size / 2} fill="var(--card)" stroke="var(--vermilion)" strokeWidth="1.8" />
      <circle cx={c.x - 5} cy={c.y} r="5.5" fill="none" stroke="var(--vermilion)" strokeWidth="2.4" />
      <path d={`M${c.x} ${c.y}h10m-3 0v4m-3-4v3`} stroke="var(--vermilion)" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  )
}

/** The part of a path a coin follows after a leading `M x y`, so a trip can join several pieces. */
export const tail = (d: string) => d.replace(/^M[^A-Za-z]*/, "")
