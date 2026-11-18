"use client"

import { FigureFrame } from "./frame"
import { Area, Arrows, archPath, Bridge, Caps, Chip, Coin, Dot, Ground, Leg, Lock, onArch, Path, tail } from "./kit"

/*
 * FIG · Into PUSD in one approval. Your USDC crosses the bridge (NEAR Intents, on the arch of Hashi's mark) and lands as
 * BCH in a contract made for your swap; the swap's own key trades it on Cauldron, and PUSD comes to your wallet. If the
 * trade can't happen, the dashed way sends the BCH back to you. One coin makes the whole trip, changing as it goes.
 */

const LOOP = 9
const STEPS = [
  "Your one approval: the USDC transfer",
  "NEAR Intents pays the BCH to a contract made for your swap",
  "The swap's own key trades it on Cauldron",
  "At least the review's floor, to your wallet",
]
const LABEL =
  "Into PUSD in one approval: your USDC on Base crosses through NEAR Intents to a contract made for your swap; the swap's own key trades it on Cauldron; PUSD comes to your Bitcoin Cash wallet, or the BCH goes back to you"

/** The coin's trip, the same in both layouts: USDC to the top of the arch, BCH to the lock, BCH to Cauldron, PUSD home. */
function Trip({ cross, trade, payout }: { cross: string; trade: string; payout: string }) {
  return (
    <>
      <Leg d={cross} loop={LOOP} stops={[[0.04, 0], [0.3, 0.5]]} show={[0.04, 0.3]}>
        <Coin logo="usdc.svg" r={15} />
      </Leg>
      <Leg d={cross} loop={LOOP} stops={[[0.3, 0.5], [0.52, 1]]} show={[0.3, 0.6]}>
        <Coin logo="bch.svg" r={15} />
      </Leg>
      <Leg d={trade} loop={LOOP} stops={[[0.6, 0], [0.72, 1]]} show={[0.6, 0.72]}>
        <Coin logo="bch.svg" r={15} />
      </Leg>
      <Leg d={payout} loop={LOOP} stops={[[0.74, 0], [0.86, 1]]} show={[0.72, 0.98]}>
        <Coin logo="pusd.svg" r={15} />
      </Leg>
    </>
  )
}

function Wide() {
  const deck = 370
  const [x0, x1] = [272, 580]
  const cross = `M246 ${deck}H${x0}${tail(archPath(x0, x1, deck))}H630`
  const trade = "M742 356C780 356 768 220 792 220"
  const payout = "M880 250V452"
  const apex = onArch(x0, x1, deck, 0.5)
  return (
    <svg viewBox="0 0 1000 560" className="block h-auto w-full" role="img" aria-label={LABEL}>
      <Arrows />
      <Ground id="into-w" w={1000} h={560} caption="Fig · Into PUSD, one approval" />
      <Caps at={{ x: 140, y: 318 }}>Base</Caps>
      <Chip at={{ x: 140, y: deck }} label="Your wallet" logo="usdc.svg" badge="base.svg" w={196} />
      <Bridge x0={x0} x1={x1} y={deck} water={440} carrier="NEAR Intents" logo="near.svg" />
      <Path d={`M246 ${deck}H${x0}`} tone="you" width={3} />
      <Path d={`M${x1} ${deck}H624`} tone="you" width={3} arrow />
      <Area x={652} y={120} w={328} h={420} label="Bitcoin Cash" tint />
      <Lock at={{ x: 692, y: deck }} w={96} h={76} />
      <Chip at={{ x: 880, y: 220 }} label="Cauldron" logo="cauldron.png" w={170} />
      <Chip at={{ x: 880, y: 482 }} label="Your wallet" logo="pusd.svg" badge="bch.svg" w={170} />
      <Path d={trade} tone="you" width={3} arrow />
      <Path d={payout} tone="you" width={3} arrow />
      <Path d="M742 392C772 412 762 482 792 482" tone="muted" dashed arrow />
      <Caps at={{ x: 690, y: 478 }}>or back to you</Caps>
      <Dot at={{ x: 259, y: deck }} n={1} />
      <Dot at={{ x: apex.x, y: apex.y + 2 }} n={2} />
      <Dot at={{ x: 773, y: 300 }} n={3} />
      <Dot at={{ x: 880, y: 352 }} n={4} />
      <Trip cross={cross} trade={trade} payout={payout} />
    </svg>
  )
}

function Tall() {
  const deck = 400
  const [x0, x1] = [70, 470]
  const cross = `M70 159V${deck}${tail(archPath(x0, x1, deck))}V600Q470 620 452 620`
  const trade = "M352 620H180Q150 620 150 650V731"
  const payout = "M150 789V880Q150 900 170 900H276"
  const apex = onArch(x0, x1, deck, 0.5)
  return (
    <svg viewBox="0 0 540 1000" className="block h-auto w-full" role="img" aria-label={LABEL}>
      <Arrows />
      <Ground id="into-t" w={540} h={1000} caption="Fig · Into PUSD" k={1.3} />
      <Caps at={{ x: 150, y: 88 }} k={1.2}>
        Base
      </Caps>
      <Chip at={{ x: 150, y: 130 }} label="Your wallet" logo="usdc.svg" badge="base.svg" w={210} k={1.2} />
      <Path d={`M70 159V${deck}`} tone="you" width={3} />
      <Bridge x0={x0} x1={x1} y={deck} water={460} carrier="NEAR Intents" logo="near.svg" k={1.2} />
      <Area x={24} y={500} w={492} h={476} label="Bitcoin Cash" tint k={1.2} />
      <Path d={`M${x1} ${deck}V600Q470 620 452 620`} tone="you" width={3} arrow />
      <Lock at={{ x: 400, y: 620 }} w={96} h={76} k={1.2} />
      <Chip at={{ x: 150, y: 760 }} label="Cauldron" logo="cauldron.png" w={190} k={1.2} />
      <Chip at={{ x: 380, y: 900 }} label="Your wallet" logo="pusd.svg" badge="bch.svg" w={200} k={1.2} />
      <Path d={trade} tone="you" width={3} arrow />
      <Path d={payout} tone="you" width={3} arrow />
      <Path d="M430 690V868" tone="muted" dashed arrow />
      <Caps at={{ x: 444, y: 790 }} anchor="start" k={1.1}>
        or back
      </Caps>
      <Dot at={{ x: 70, y: 290 }} n={1} k={1.2} />
      <Dot at={{ x: apex.x, y: apex.y + 2 }} n={2} k={1.2} />
      <Dot at={{ x: 250, y: 620 }} n={3} k={1.2} />
      <Dot at={{ x: 150, y: 840 }} n={4} k={1.2} />
      <Trip cross={cross} trade={trade} payout={payout} />
    </svg>
  )
}

export function IntoFigure() {
  return <FigureFrame name="into" steps={STEPS} wide={<Wide />} tall={<Tall />} />
}
