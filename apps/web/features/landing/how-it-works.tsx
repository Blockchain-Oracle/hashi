import {
  CheckmarkCircle02Icon,
  Coins01Icon,
  FlashIcon,
  NotificationSquareIcon,
  Route02Icon,
  Shield01Icon,
} from '@hugeicons/core-free-icons'
import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, BrandLogo } from '@/components/kit/logos'
import { StatusPill } from '@/components/kit/status-pill'
import { StepTimeline } from '@/components/kit/step-timeline'
import { Button } from '@/components/ui/button'
import { PROVIDERS } from '@/lib/engine/types'
import type { LandingStats } from '@/lib/landing/stats'
import { cn } from '@/lib/utils'

function Card({
  icon,
  title,
  body,
  className,
  children,
}: {
  icon: typeof FlashIcon
  title: string
  body: string
  className?: string
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        'relative flex flex-col justify-end overflow-hidden rounded-[2.25rem] bg-white/[0.035] ring-1 ring-white/[0.08] sm:min-h-[34rem]',
        className,
      )}
    >
      {/* On a phone the picture takes its own space above the words; wider, the words sit over its lower part. */}
      <div className="relative h-[19rem] sm:absolute sm:inset-x-0 sm:top-0 sm:h-[64%]">{children}</div>
      <div className="relative flex flex-col gap-3 p-7 sm:p-9">
        <Icon icon={icon} size={28} strokeWidth={1.5} />
        <h3 className="font-medium text-[1.75rem] tracking-[-0.035em]">{title}</h3>
        <p className="max-w-md text-[1.0625rem] text-foreground/60 leading-relaxed">{body}</p>
      </div>
    </article>
  )
}

/** A tilted cream card with Hashi's route list, with the live quote. */
function RouteVisual({ data }: { data: LandingStats }) {
  const s = data.sample
  const paused = data.status.thorchainPaused?.length
  return (
    <div className="absolute top-14 left-1/2 w-[30rem] max-w-[92%] -translate-x-[46%] -rotate-[7deg] rounded-[1.75rem] bg-[#fffaf5] p-6 font-mono text-[#121111] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)]">
      <p className="text-[1.375rem] tracking-[-0.02em]">Routes</p>
      <p className="mt-1 text-[#121111]/50 text-xs">
        {s ? `${s.amountIn} USDC on Base → PUSD` : 'USDC on Base → PUSD'} · live
      </p>
      <div className="mt-5 flex flex-col gap-2.5">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_0_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.25)] ring-1 ring-[#ff2f00]/40">
          <BrandLogo brand="near" size={30} />
          <span className="flex-1 text-sm">{s ? PROVIDERS[s.provider].name : 'NEAR Intents'}</span>
          <StatusPill
            tone="vermilion"
            icon={<Icon icon={FlashIcon} />}
            className="h-6 px-2.5 font-sans text-[0.6875rem]"
          >
            Best
          </StatusPill>
          <span className="w-20 text-right text-[0.9375rem]">{s ? s.amountOut.toFixed(2) : '—'}</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-[#f2efeb] p-3 opacity-80">
          <BrandLogo brand="thorchain" size={30} />
          <span className="flex-1 text-sm">THORChain</span>
          <span className="text-[#121111]/55 text-xs">{paused ? 'paused on Base' : 'live'}</span>
        </div>
      </div>
    </div>
  )
}

function Coin({
  asset,
  className,
  style,
}: {
  asset: 'PUSD' | 'MUSD'
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={cn('absolute aspect-square', className)} style={style}>
      <div className="absolute inset-0 translate-y-[5%] rounded-full bg-[linear-gradient(180deg,#a8661f,#5a2f0c)]" />
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_210deg,#fff0c9,#e7a548,#fff6dd,#c97a26,#ffe3a6,#fff0c9)] p-[7%] shadow-[0_40px_70px_-25px_rgb(255_47_0/0.55)]">
        <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_28%,#ffffff,#f4efe9_58%,#e3d8cd)] shadow-[inset_0_8px_20px_rgb(0_0_0/0.18)]">
          <AssetLogo asset={asset} size={140} className="size-[62%]" />
          <span className="absolute inset-0 bg-[linear-gradient(135deg,rgb(255_255_255/0.6),transparent_42%)]" />
        </div>
      </div>
    </div>
  )
}

/** Bitcoin Cash's two dollars as 3D coins: glossy coins on a glow, drifting slowly. */
function CoinsVisual({ data }: { data: LandingStats }) {
  const pusd = data.markets.find((m) => m.id === 'PUSD')
  const musd = data.markets.find((m) => m.id === 'MUSD')
  const price = (n: number | undefined) =>
    n === undefined
      ? '—'
      : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })
  return (
    <>
      <div className="absolute top-[18%] left-1/2 h-72 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_120_40/0.55),rgb(253_200_48/0.18)_60%,transparent)] blur-2xl" />
      <div className="absolute inset-0 animate-drift">
        <Coin
          asset="MUSD"
          className="top-[24%] left-[50%] w-36 sm:w-44"
          style={{ transform: 'perspective(900px) rotateY(24deg) rotateX(10deg) rotate(10deg)' }}
        />
        <Coin
          asset="PUSD"
          className="top-[10%] left-[14%] w-44 sm:w-56"
          style={{ transform: 'perspective(900px) rotateY(-22deg) rotateX(12deg) rotate(-8deg)' }}
        />
      </div>
      <div className="absolute right-6 bottom-4 flex flex-col items-end gap-1.5 font-mono text-xs">
        <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
          1 PUSD = {price(pusd?.priceUsd)}
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
          1 MUSD = {price(musd?.priceUsd)}
        </span>
      </div>
    </>
  )
}

/** Hashi's tracker as lock-screen notifications: a tilted dark device with the steps and the toast. */
function TrackerVisual() {
  return (
    <>
      <div className="absolute top-20 left-1/2 w-[17rem] -translate-x-1/2 rotate-[-6deg] sm:w-[19rem] sm:-translate-x-[62%] rounded-[2.25rem] bg-[#0b0a0a] p-6 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
        <p className="mb-5 font-mono text-[0.625rem] text-foreground/50 uppercase tracking-[0.08em]">
          USDC (Base) → PUSD
        </p>
        <StepTimeline
          steps={[
            { id: 'deposit', title: 'Deposit on Base', chain: 'base', state: 'done' },
            { id: 'bridge', title: 'NEAR Intents → BCH', chain: 'bch', state: 'done' },
            { id: 'swap', title: 'Swap into PUSD', chain: 'bch', state: 'done' },
          ]}
        />
      </div>
      <div className="absolute top-5 right-4 flex w-[15.5rem] rotate-[3deg] sm:right-auto sm:left-1/2 sm:w-[17rem] sm:translate-x-[-4%] items-center gap-3 rounded-2xl bg-[#fffaf5] p-3.5 text-[#121111] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl candy-green text-white shadow-gloss">
          <Icon icon={CheckmarkCircle02Icon} />
        </span>
        <span className="min-w-0">
          <span className="block font-medium text-sm">Swap complete</span>
          <span className="block truncate text-[#121111]/60 text-xs">PUSD arrived in your wallet</span>
        </span>
      </div>
    </>
  )
}

/** A photographic card: a dawn over ink (Paper Shaders frame) and the line Bitcoin Cash still lives by. */
function QuoteCard() {
  return (
    <article className="relative isolate flex min-h-[34rem] flex-col justify-end overflow-hidden rounded-[2.25rem] ring-1 ring-white/[0.08]">
      <Image
        src="/landing/ink-dawn.webp"
        alt=""
        fill
        sizes="(min-width: 768px) 560px, 100vw"
        className="-z-10 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(18_17_17/0.92),rgb(18_17_17/0.35)_55%,transparent)]" />
      <div className="flex flex-col gap-4 p-7 sm:p-9">
        <p className="max-w-md text-balance font-medium text-[1.75rem] leading-[1.2] tracking-[-0.03em]">
          “A purely peer-to-peer version of electronic cash.”
        </p>
        <p className="text-foreground/60">
          — Satoshi Nakamoto, the Bitcoin whitepaper. Bitcoin Cash still runs on it.
        </p>
      </div>
    </article>
  )
}

/** The dark chapter: a two-column header, then a bento of real Hashi parts. */
export function HowItWorks({ data }: { data: LandingStats }) {
  return (
    <section id="how" className="relative scroll-mt-24 px-2 pt-28 sm:px-4">
      {/* `dark` scopes the ink palette to this chapter, so every part inside reads correctly in both themes. */}
      <div className="dark mx-auto max-w-[88rem] rounded-[3rem] bg-[#121111] px-4 pt-16 pb-6 text-foreground shadow-float sm:px-8 sm:pt-24 sm:pb-8 dark:bg-[#151414] dark:ring-1 dark:ring-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-2 md:flex-row md:items-start md:justify-between">
          <h2 className="max-w-2xl text-balance font-normal text-[2.25rem] leading-[1.1] tracking-[-0.04em] sm:text-[3rem]">
            One screen, your own two wallets, and the best route between them.
          </h2>
          <div className="flex max-w-sm flex-col items-start gap-6">
            <p className="font-medium text-[1.0625rem] text-foreground/60 leading-relaxed">
              Hashi does the routing. NEAR Intents or THORChain carries the dollars to Bitcoin Cash, and
              Cauldron turns the BCH into PUSD or MUSD. Coming back works the same way in reverse.
            </p>
            <Button
              variant="outline"
              className="h-12 rounded-full px-6"
              nativeButton={false}
              render={<Link href="/swap" />}
            >
              Try a swap
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-3 md:grid-cols-2">
          <Card
            icon={Route02Icon}
            title="Every route, priced end to end"
            body="NEAR Intents and THORChain, each with Cauldron for the last step, ranked on what you keep: bridge, pool and miner fees, and the gas to start."
          >
            <RouteVisual data={data} />
          </Card>
          <Card
            icon={Coins01Icon}
            title="Bitcoin Cash’s own dollars"
            body="PUSD and MUSD are stablecoins native to Bitcoin Cash. Hashi lands your dollars in either, or in plain BCH, in your own wallet."
          >
            <CoinsVisual data={data} />
          </Card>
          <QuoteCard />
          <Card
            icon={NotificationSquareIcon}
            title="Both chains, to the last block"
            body="Every step with its explorer link and the time left. Close the tab when you like: the swap picks up where it stopped."
          >
            <TrackerVisual />
          </Card>
        </div>
        <p className="mx-auto mt-6 flex max-w-6xl items-center justify-center gap-2 px-2 pb-2 text-center text-foreground/45 text-sm">
          <Icon icon={Shield01Icon} />
          Hashi never holds your money. Your wallets approve every step.
        </p>
      </div>
    </section>
  )
}
