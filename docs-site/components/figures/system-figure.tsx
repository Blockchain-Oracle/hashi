"use client"

import { FigureFrame } from "./frame"
import { Area, Arrows, Caps, Chip, Coin, Dot, Ground, HashiTile, KeyTile, Leg, Lock, Path } from "./kit"

/*
 * FIG · Who touches what. Your money's path is vermilion: your wallet, a bridge (NEAR Intents or THORChain), your swap's
 * contract on Bitcoin Cash, Cauldron, your wallet. Hashi, in your browser, prices, builds and asks (dashed), and holds the
 * swap's own key; the wallet layers sit under each wallet; Hashi's server only keeps contract terms, returns unfinished
 * BCH and pays Base gas.
 */

const LOOP = 8
const STEPS = [
  "You approve in your wallet, on any of eight chains (Reown AppKit)",
  "NEAR Intents or THORChain carry it to your swap contract",
  "Hashi, in your browser, trades it on Cauldron with the swap's own key",
  "PUSD or MUSD to your wallet (WizardConnect); Hashi's server only returns unfinished BCH",
]
const LABEL =
  "Who touches what: your money goes from your wallet through NEAR Intents or THORChain to your swap contract on Bitcoin Cash, then Cauldron, then your wallet. Hashi in your browser asks your wallets and holds the swap's key; Hashi's server keeps contract terms and returns unfinished BCH"

function Trip({ a, b, c, d }: { a: string; b: string; c: string; d: string }) {
  return (
    <>
      <Leg d={a} loop={LOOP} stops={[[0.03, 0], [0.18, 1]]} show={[0.03, 0.2]}>
        <Coin logo="usdc.svg" r={14} />
      </Leg>
      <Leg d={b} loop={LOOP} stops={[[0.28, 0], [0.45, 1]]} show={[0.27, 0.5]}>
        <Coin logo="bch.svg" r={14} />
      </Leg>
      <Leg d={c} loop={LOOP} stops={[[0.55, 0], [0.65, 1]]} show={[0.55, 0.66]}>
        <Coin logo="bch.svg" r={14} />
      </Leg>
      <Leg d={d} loop={LOOP} stops={[[0.74, 0], [0.84, 1]]} show={[0.73, 0.97]}>
        <Coin logo="pusd.svg" r={14} />
      </Leg>
    </>
  )
}

function Wide() {
  const a = "M210 372C232 372 232 330 252 330"
  const b = "M445 330C480 330 490 370 526 376"
  const c = "M624 380H666"
  const d = "M820 380H866"
  return (
    <svg viewBox="0 0 1080 700" className="block h-auto w-full" role="img" aria-label={LABEL}>
      <Arrows />
      <Ground id="sys-w" w={1080} h={700} caption="Fig · Who touches what" />

      <Area x={330} y={64} w={440} h={126} label="Your browser" dashed />
      <Chip at={{ x: 450, y: 148 }} label="Hashi" w={170} icon={(p) => <HashiTile c={p} size={32} />} />
      <Chip at={{ x: 655, y: 148 }} label="Swap's key" w={190} icon={(p) => <KeyTile c={p} size={32} />} />
      <Path d="M365 148H115V346" tone="muted" dashed arrow />
      <Caps at={{ x: 240, y: 136 }}>asks your wallets</Caps>
      <Path d="M640 177C640 214 610 236 596 296" tone="muted" dashed arrow />
      <Caps at={{ x: 652, y: 206 }} anchor="start">
        signs the trade
      </Caps>

      <Chip at={{ x: 115, y: 380 }} label="Your wallet" logo="usdc.svg" badge="base.svg" w={190} />
      <Chip at={{ x: 350, y: 330 }} label="NEAR Intents" logo="near.svg" w={190} />
      <Chip at={{ x: 350, y: 430 }} label="THORChain" logo="thorchain.svg" w={190} />
      <Path d={a} tone="you" width={3} arrow />
      <Path d="M210 388C232 388 232 430 252 430" tone="you" width={3} arrow />

      <Area x={480} y={222} w={584} h={290} label="Bitcoin Cash" tint />
      <Path d={b} tone="you" width={3} arrow />
      <Path d="M445 430C480 430 490 390 526 386" tone="you" width={3} arrow />
      <Lock at={{ x: 575, y: 380 }} w={90} h={72} />
      <Chip at={{ x: 745, y: 380 }} label="Cauldron" logo="cauldron.png" w={150} />
      <Chip at={{ x: 960, y: 380 }} label="Your wallet" logo="pusd.svg" badge="bch.svg" w={176} />
      <Path d={c} tone="you" width={3} arrow />
      <Path d={d} tone="you" width={3} arrow />

      <Chip at={{ x: 115, y: 616 }} label="Reown AppKit" logo="walletconnect.svg" w={196} />
      <Path d="M115 587V413" tone="muted" dashed />
      <Chip at={{ x: 960, y: 616 }} label="WizardConnect" logo="wizardconnect.png" w={196} />
      <Path d="M960 587V413" tone="muted" dashed />
      <Chip at={{ x: 760, y: 616 }} label="Electrum" w={140} />
      <Path d="M760 587V413" tone="muted" dashed />
      <Caps at={{ x: 772, y: 548 }} anchor="start">
        broadcast
      </Caps>

      <Area x={250} y={552} w={400} h={120} label="Hashi's server" dashed />
      <Chip at={{ x: 360, y: 628 }} label="Keeper" w={150} />
      <Chip at={{ x: 548, y: 628 }} label="Gas relayer" w={166} />
      <Path d="M380 599C380 520 560 520 572 458" tone="muted" dashed arrow />
      <Caps at={{ x: 420, y: 538 }} anchor="start">
        returns unfinished BCH
      </Caps>

      <Dot at={{ x: 231, y: 351 }} n={1} />
      <Dot at={{ x: 486, y: 353 }} n={2} />
      <Dot at={{ x: 645, y: 380 }} n={3} />
      <Dot at={{ x: 843, y: 380 }} n={4} />
      <Trip a={a} b={b} c={c} d={d} />
    </svg>
  )
}

function Tall() {
  const a = "M150 309V391"
  const b = "M150 449C150 520 200 560 222 584"
  const c = "M270 676V731"
  const d = "M270 789V871"
  const k = 1.2
  return (
    <svg viewBox="0 0 540 1180" className="block h-auto w-full" role="img" aria-label={LABEL}>
      <Arrows />
      <Ground id="sys-t" w={540} h={1180} caption="Fig · Who touches what" k={1.3} />
      <Area x={24} y={70} w={492} h={126} label="Your browser" dashed k={k} />
      <Chip at={{ x: 150, y: 150 }} label="Hashi" w={190} k={k} icon={(p) => <HashiTile c={p} size={32} />} />
      <Chip at={{ x: 385, y: 150 }} label="Swap's key" w={210} k={k} icon={(p) => <KeyTile c={p} size={32} />} />

      <Chip at={{ x: 150, y: 280 }} label="Your wallet" logo="usdc.svg" badge="base.svg" w={210} k={k} />
      <Chip at={{ x: 385, y: 280 }} label="Reown" logo="walletconnect.svg" w={160} k={k} />
      <Path d="M255 280H308" tone="muted" dashed />
      <Chip at={{ x: 150, y: 420 }} label="NEAR Intents" logo="near.svg" w={210} k={k} />
      <Chip at={{ x: 395, y: 420 }} label="THORChain" logo="thorchain.svg" w={190} k={k} />
      <Path d={a} tone="you" width={3} arrow />
      <Path d="M220 309C300 330 395 340 395 391" tone="you" width={3} arrow />

      <Area x={24} y={500} w={492} h={470} label="Bitcoin Cash" tint k={k} />
      <Path d={b} tone="you" width={3} arrow />
      <Path d="M395 449C395 520 340 560 318 584" tone="you" width={3} arrow />
      <Lock at={{ x: 270, y: 620 }} w={90} h={72} k={k} />
      <Path d="M478 179C528 280 528 520 320 598" tone="muted" dashed arrow />
      <Chip at={{ x: 270, y: 760 }} label="Cauldron" logo="cauldron.png" w={190} k={k} />
      <Chip at={{ x: 270, y: 900 }} label="Your wallet" logo="pusd.svg" badge="bch.svg" w={210} k={k} />
      <Path d={c} tone="you" width={3} arrow />
      <Path d={d} tone="you" width={3} arrow />
      <Caps at={{ x: 270, y: 948 }} k={1.1}>
        WizardConnect
      </Caps>

      <Area x={24} y={1000} w={492} h={150} label="Hashi's server" dashed k={k} />
      <Chip at={{ x: 150, y: 1090 }} label="Keeper" w={180} k={k} />
      <Chip at={{ x: 390, y: 1090 }} label="Gas relayer" w={200} k={k} />
      <Path d="M110 1061V1052H40V640H222" tone="muted" dashed arrow />

      <Dot at={{ x: 150, y: 350 }} n={1} k={k} />
      <Dot at={{ x: 150, y: 474 }} n={2} k={k} />
      <Dot at={{ x: 270, y: 704 }} n={3} k={k} />
      <Dot at={{ x: 270, y: 830 }} n={4} k={k} />
      <Trip a={a} b={b} c={c} d={d} />
    </svg>
  )
}

export function SystemFigure({ className }: { className?: string }) {
  return <FigureFrame name="system" steps={STEPS} wide={<Wide />} tall={<Tall />} {...(className ? { className } : {})} />
}
