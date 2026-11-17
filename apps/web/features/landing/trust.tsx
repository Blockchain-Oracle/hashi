'use client'

import { Coins01Icon, RefreshIcon, ShieldKeyIcon, UserBlock01Icon } from '@hugeicons/core-free-icons'
import { WalletWalletConnect } from '@web3icons/react'
import { useReducedMotion } from 'motion/react'
import Image from 'next/image'
import { type ReactNode, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { BrandLogo, ChainLogo } from '@/components/kit/logos'
import { StepTimeline } from '@/components/kit/step-timeline'
import type { LandingSample } from '@/lib/landing/stats'
import { cn } from '@/lib/utils'

const ADVANCE_MS = 6000

interface Point {
  id: string
  icon: typeof ShieldKeyIcon
  title: string
  body: string
  visual: ReactNode | null
}

function Approval({ logo, wallet, what }: { logo: ReactNode; wallet: string; what: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-card ring-1 ring-border">
      {logo}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-sm">{wallet}</span>
        <span className="block truncate text-muted-foreground text-xs">{what}</span>
      </span>
      <span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs shadow-gloss">
        Approve
      </span>
    </div>
  )
}

const POINTS: Point[] = [
  {
    id: 'custody',
    icon: ShieldKeyIcon,
    title: 'Your keys, your coins',
    body: 'Hashi never holds your money. Your own wallets approve every step, and deposits go straight to the bridge you chose.',
    visual: (
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Approval
          logo={<WalletWalletConnect size={32} variant="branded" />}
          wallet="Your Base wallet"
          what="Send USDC to the NEAR Intents deposit"
        />
        <Approval
          logo={<Image src="/brands/wizardconnect.png" alt="" width={32} height={32} />}
          wallet="Your Bitcoin Cash wallet"
          what="Swap the arrived BCH into PUSD"
        />
      </div>
    ),
  },
  {
    id: 'refunds',
    icon: RefreshIcon,
    title: 'Refunds built in',
    body: 'If the price moves past your slippage or a deposit arrives too late, NEAR Intents or THORChain sends it back to your own address.',
    visual: (
      <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-card ring-1 ring-border">
        <StepTimeline
          steps={[
            { id: 'deposit', title: 'Deposit on Base', chain: 'base', state: 'done' },
            { id: 'bridge', title: 'Price moved past 1% slippage', chain: 'bch', state: 'failed' },
            { id: 'refund', title: 'Refunded to your wallet', chain: 'base', state: 'done' },
          ]}
        />
      </div>
    ),
  },
  {
    id: 'fees',
    icon: Coins01Icon,
    title: 'Every fee before you sign',
    body: 'The bridge’s fee, Cauldron’s 0.1% router fee and pool fee, the miner fee and the gas to start, in dollars, added up before your first approval.',
    visual: null,
  },
  {
    id: 'account',
    icon: UserBlock01Icon,
    title: 'No account, no sign-up',
    body: 'No email, no password, no custody. Your swap history stays in your own browser, and any swap can be reopened from it.',
    visual: (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-card p-6 text-center shadow-card ring-1 ring-border">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <Icon icon={UserBlock01Icon} size={24} />
        </span>
        <p className="font-medium">Connect, swap, done.</p>
        <p className="text-muted-foreground text-sm">History lives in this browser, nowhere else.</p>
      </div>
    ),
  },
]

/**
 * The trust section: a list that advances on its own, each item filling as it plays, beside a dark panel
 * that shows the point being made. Click any item to jump to it; with reduced motion nothing advances by itself.
 */
const FEE_LABEL = {
  bridge: { term: 'NEAR Intents', logo: <BrandLogo brand="near" size={18} /> },
  cauldron: { term: 'Cauldron swap', logo: <BrandLogo brand="cauldron" size={18} /> },
  network: { term: 'Network fee', logo: <ChainLogo chain="bch" size={18} /> },
} as const

/** The fee lines of the live 100 USDC → PUSD quote this page was built with. */
function FeeCard({ fees }: { fees: LandingSample | undefined }) {
  const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-card p-5 text-sm shadow-card ring-1 ring-border">
      <p className="label-mono">Live · 100 USDC on Base → PUSD</p>
      {fees?.feeLines.length ? (
        <dl className="flex flex-col gap-2.5">
          {fees.feeLines.map((line) => (
            <div key={line.id} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                {FEE_LABEL[line.id].logo}
                {FEE_LABEL[line.id].term}
              </dt>
              <dd className="font-mono">{usd(line.usd)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 text-muted-foreground">
            <dt className="flex items-center gap-2">
              <ChainLogo chain="base" size={18} />
              Base gas to start
            </dt>
            <dd>read live in the app</dd>
          </div>
          <div className="mt-1 flex items-center justify-between border-border border-t pt-3 font-medium">
            <dt>Total before gas</dt>
            <dd className="font-mono">{fees.feesUsd === undefined ? '—' : usd(fees.feesUsd)}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-muted-foreground">
          The live quote is unavailable right now; the app shows every fee.
        </p>
      )}
    </div>
  )
}

export function Trust({ sample }: { sample: LandingSample | undefined }) {
  const [active, setActive] = useState(0)
  const still = useReducedMotion()
  const point = POINTS[active] ?? POINTS[0]

  return (
    <section id="trust" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pt-28 sm:px-6">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <p className="label-mono">/ Trust</p>
          <h2 className="text-title text-balance">Safe by design, not by promise.</h2>
          <ul className="flex flex-col gap-2">
            {POINTS.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={i === active}
                  className={cn(
                    'relative w-full overflow-hidden rounded-2xl px-4 py-3.5 text-left transition-colors',
                    i === active ? 'bg-muted' : 'hover:bg-muted/60',
                  )}
                >
                  {i === active && !still ? (
                    <span
                      key={`${p.id}-${active}`}
                      aria-hidden
                      className="absolute inset-0 animate-progress-fill bg-foreground/[0.05]"
                      style={{ '--progress-duration': `${ADVANCE_MS}ms` } as React.CSSProperties}
                      onAnimationEnd={() => setActive((n) => (n + 1) % POINTS.length)}
                    />
                  ) : null}
                  <span className="relative flex items-center gap-3 font-medium">
                    <Icon icon={p.icon} />
                    {p.title}
                  </span>
                  {i === active ? (
                    <span className="relative mt-1.5 block pl-[1.9em] text-foreground/70 leading-relaxed">
                      {p.body}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* A dark device panel: the point being made, tilted on a vermilion glow, with a mono caption. */}
        <div className="dark relative isolate flex min-h-[24rem] flex-col overflow-hidden rounded-[2.25rem] bg-[#121111] p-6 text-foreground shadow-float sm:min-h-[30rem] sm:p-8">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgb(255_255_255/0.07)_1px,transparent_1px)] bg-size-[18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
          />
          <div
            aria-hidden
            className="absolute -bottom-40 left-1/2 -z-10 h-96 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_47_0/0.55),rgb(255_120_40/0.2)_55%,transparent)] blur-2xl"
          />
          <div className="flex items-center justify-between font-mono text-[0.6875rem] text-foreground/55 uppercase tracking-[0.08em]">
            <span>
              / 0{active + 1} — {point?.title}
            </span>
            <span>
              {active + 1} / {POINTS.length}
            </span>
          </div>
          <div className="flex flex-1 items-center justify-center py-8">
            <div
              key={point?.id}
              className="flex w-full justify-center animate-rise [animation-duration:0.7s]"
            >
              <div className="flex w-full max-w-sm -rotate-2 justify-center drop-shadow-[0_30px_40px_rgb(0_0_0/0.55)]">
                {point?.id === 'fees' ? <FeeCard fees={sample} /> : point?.visual}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
