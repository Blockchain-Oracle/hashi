"use client"

import { FigureFrame } from "./frame"
import { Area, Arrows, Caps, Chip, Coin, Dot, Ground, Leg, Path } from "./kit"

/*
 * FIG · On Bitcoin Cash, one transaction. PUSD leaves your wallet, Cauldron's pools trade it at the built price (or the
 * whole transaction is refused), and MUSD comes back in that same transaction, in about 15 seconds.
 */

const LOOP = 6
const STEPS = [
  "Your one approval",
  "Cauldron's pools trade it at the built price, or not at all",
  "MUSD in the same transaction, about 15 seconds",
]
const LABEL =
  "On Bitcoin Cash in one transaction: PUSD from your wallet, traded through Cauldron's pools, MUSD back to your wallet"

function Trip({ a, b }: { a: string; b: string }) {
  return (
    <>
      <Leg d={a} loop={LOOP} stops={[[0.05, 0], [0.35, 1]]} show={[0.05, 0.4]}>
        <Coin logo="pusd.svg" r={15} />
      </Leg>
      <Leg d={b} loop={LOOP} stops={[[0.45, 0], [0.75, 1]]} show={[0.42, 0.95]}>
        <Coin logo="musd.png" r={15} />
      </Leg>
    </>
  )
}

function Wide() {
  const a = "M290 270H408"
  const b = "M592 270H704"
  return (
    <svg viewBox="0 0 1000 420" className="block h-auto w-full" role="img" aria-label={LABEL}>
      <Arrows />
      <Ground id="on-w" w={1000} h={420} caption="Fig · On Bitcoin Cash, one transaction" />
      <Area x={24} y={76} w={952} h={320} label="Bitcoin Cash" tint />
      <Path d="M190 196V182H810V196" tone="muted" />
      <Caps at={{ x: 500, y: 170 }}>One transaction · about 15 seconds</Caps>
      <Chip at={{ x: 190, y: 270 }} label="Your wallet" logo="pusd.svg" badge="bch.svg" w={200} />
      <Chip at={{ x: 500, y: 270 }} label="Cauldron" logo="cauldron.png" w={180} />
      <Chip at={{ x: 810, y: 270 }} label="Your wallet" logo="musd.png" badge="bch.svg" w={200} />
      <Path d={a} tone="you" width={3} arrow />
      <Path d={b} tone="you" width={3} arrow />
      <Dot at={{ x: 349, y: 270 }} n={1} />
      <Dot at={{ x: 500, y: 236 }} n={2} />
      <Dot at={{ x: 648, y: 270 }} n={3} />
      <Trip a={a} b={b} />
    </svg>
  )
}

function Tall() {
  const a = "M270 199V301"
  const b = "M270 359V471"
  return (
    <svg viewBox="0 0 540 680" className="block h-auto w-full" role="img" aria-label={LABEL}>
      <Arrows />
      <Ground id="on-t" w={540} h={680} caption="Fig · On Bitcoin Cash" k={1.3} />
      <Area x={24} y={70} w={492} h={580} label="Bitcoin Cash" tint k={1.2} />
      <Chip at={{ x: 270, y: 170 }} label="Your wallet" logo="pusd.svg" badge="bch.svg" w={220} k={1.2} />
      <Chip at={{ x: 270, y: 330 }} label="Cauldron" logo="cauldron.png" w={200} k={1.2} />
      <Chip at={{ x: 270, y: 500 }} label="Your wallet" logo="musd.png" badge="bch.svg" w={220} k={1.2} />
      <Path d={a} tone="you" width={3} arrow />
      <Path d={b} tone="you" width={3} arrow />
      <Caps at={{ x: 270, y: 598 }} k={1.15}>
        One transaction · ~15 s
      </Caps>
      <Dot at={{ x: 270, y: 250 }} n={1} k={1.2} />
      <Dot at={{ x: 395, y: 330 }} n={2} k={1.2} />
      <Dot at={{ x: 270, y: 415 }} n={3} k={1.2} />
      <Trip a={a} b={b} />
    </svg>
  )
}

export function OnFigure() {
  return <FigureFrame name="on" steps={STEPS} wide={<Wide />} tall={<Tall />} />
}
