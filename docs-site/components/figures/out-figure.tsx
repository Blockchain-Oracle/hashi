"use client"

import { FigureFrame } from "./frame"
import { Area, Arrows, archPath, Block, Bridge, Caps, Chip, Coin, Dot, Ground, Leg, onArch, Path, tail } from "./kit"

/*
 * FIG · Out to USDC in one approval. Your PUSD is sold on Cauldron, and the same transaction pays its BCH straight to
 * NEAR Intents' deposit address; Bitcoin Cash confirms it (two blocks, which turn green as the coin waits on each), NEAR
 * swaps it over the arch, and USDC lands in your wallet on Base.
 */

const LOOP = 10
const STEPS = [
  "Your one approval: the sale, which pays NEAR Intents in the same transaction",
  "Bitcoin Cash confirms it: two blocks, about 20 minutes",
  "NEAR Intents swaps the BCH",
  "USDC to your wallet on Base",
]
const LABEL =
  "Out to USDC in one approval: your PUSD is sold on Cauldron in a transaction that pays NEAR Intents directly; after two Bitcoin Cash blocks NEAR Intents swaps it, and USDC lands in your wallet on Base"

/** Where along the trip the coin waits on each block, and where it turns into USDC (fractions of the path). */
function Trip({ sale, out, b1, b2, apex }: { sale: string; out: string; b1: number; b2: number; apex: number }) {
  return (
    <>
      <Leg d={sale} loop={LOOP} stops={[[0.03, 0], [0.13, 1]]} show={[0.03, 0.14]}>
        <Coin logo="pusd.svg" r={15} />
      </Leg>
      <Leg
        d={out}
        loop={LOOP}
        stops={[
          [0.14, 0],
          [0.2, b1],
          [0.34, b1],
          [0.4, b2],
          [0.56, b2],
          [0.7, apex],
        ]}
        show={[0.14, 0.7]}
      >
        <Coin logo="bch.svg" r={15} />
      </Leg>
      <Leg d={out} loop={LOOP} stops={[[0.7, apex], [0.84, 1]]} show={[0.7, 0.98]}>
        <Coin logo="usdc.svg" r={15} />
      </Leg>
    </>
  )
}

function Wide() {
  const deck = 390
  const [x0, x1] = [430, 740]
  const sale = "M175 249V361"
  const out = `M260 ${deck}H${x0}${tail(archPath(x0, x1, deck))}H778`
  const top = onArch(x0, x1, deck, 0.5)
  return (
    <svg viewBox="0 0 1000 560" className="block h-auto w-full" role="img" aria-label={LABEL}>
      <Arrows />
      <Ground id="out-w" w={1000} h={560} caption="Fig · Out to USDC, one approval" />
      <Area x={24} y={120} w={364} h={420} label="Bitcoin Cash" tint />
      <Chip at={{ x: 175, y: 220 }} label="Your wallet" logo="pusd.svg" badge="bch.svg" w={196} />
      <Chip at={{ x: 175, y: deck }} label="Cauldron" logo="cauldron.png" w={170} />
      <Path d={sale} tone="you" width={3} arrow />
      <Path d={`M260 ${deck}H${x0}`} tone="you" width={3} />
      <Caps at={{ x: 327, y: 358 }}>Blocks</Caps>
      <Block at={{ x: 305, y: deck }} n={1} loop={LOOP} lit={[0.2, 0.995]} />
      <Block at={{ x: 350, y: deck }} n={2} loop={LOOP} lit={[0.4, 0.995]} />
      <Bridge x0={x0} x1={x1} y={deck} water={460} carrier="NEAR Intents" logo="near.svg" />
      <Path d={`M${x1} ${deck}H778`} tone="you" width={3} arrow />
      <Caps at={{ x: 880, y: 338 }}>Base</Caps>
      <Chip at={{ x: 880, y: deck }} label="Your wallet" logo="usdc.svg" badge="base.svg" w={196} />
      <Dot at={{ x: 175, y: 305 }} n={1} />
      <Dot at={{ x: 327, y: 432 }} n={2} />
      <Dot at={{ x: top.x, y: top.y + 2 }} n={3} />
      <Dot at={{ x: 754, y: deck }} n={4} />
      <Trip sale={sale} out={out} b1={45 / 570} b2={90 / 570} apex={0.616} />
    </svg>
  )
}

function Tall() {
  const deck = 680
  const [x0, x1] = [90, 430]
  const span = x1 - x0
  const lift = span * 0.39
  // The same arch, crossed from right to left.
  const back = `C${x1 - span / 6} ${deck - lift} ${x0 + span / 6} ${deck - lift} ${x0} ${deck}`
  const sale = "M150 179V271"
  const out = `M235 300H400Q430 300 430 330V${deck}${back}V830Q90 850 110 850H166`
  const top = onArch(x0, x1, deck, 0.5)
  return (
    <svg viewBox="0 0 540 960" className="block h-auto w-full" role="img" aria-label={LABEL}>
      <Arrows />
      <Ground id="out-t" w={540} h={960} caption="Fig · Out to USDC" k={1.3} />
      <Area x={24} y={70} w={492} h={400} label="Bitcoin Cash" tint k={1.2} />
      <Chip at={{ x: 150, y: 150 }} label="Your wallet" logo="pusd.svg" badge="bch.svg" w={210} k={1.2} />
      <Chip at={{ x: 150, y: 300 }} label="Cauldron" logo="cauldron.png" w={190} k={1.2} />
      <Path d={sale} tone="you" width={3} arrow />
      <Path d={`M245 300H400Q430 300 430 330V${deck}`} tone="you" width={3} />
      <Caps at={{ x: 456, y: 405 }} anchor="start" k={1.1}>
        Blocks
      </Caps>
      <Block at={{ x: 430, y: 380 }} n={1} loop={LOOP} lit={[0.2, 0.995]} k={1.1} />
      <Block at={{ x: 430, y: 425 }} n={2} loop={LOOP} lit={[0.4, 0.995]} k={1.1} />
      <Bridge x0={x0} x1={x1} y={deck} water={740} carrier="NEAR Intents" logo="near.svg" k={1.2} />
      <Path d={`M${x0} ${deck}V830Q90 850 110 850H162`} tone="you" width={3} arrow />
      <Caps at={{ x: 270, y: 800 }} k={1.2}>
        Base
      </Caps>
      <Chip at={{ x: 270, y: 850 }} label="Your wallet" logo="usdc.svg" badge="base.svg" w={210} k={1.2} />
      <Dot at={{ x: 150, y: 225 }} n={1} k={1.2} />
      <Dot at={{ x: 390, y: 402 }} n={2} k={1.2} />
      <Dot at={{ x: top.x, y: top.y + 2 }} n={3} k={1.2} />
      <Dot at={{ x: 90, y: 770 }} n={4} k={1.2} />
      <Trip sale={sale} out={out} b1={0.219} b2={0.256} apex={0.636} />
    </svg>
  )
}

export function OutFigure() {
  return <FigureFrame name="out" steps={STEPS} wide={<Wide />} tall={<Tall />} />
}
