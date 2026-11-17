import {
  Alert02Icon,
  ArrowDataTransferVerticalIcon,
  ArrowRight01Icon,
  BridgeIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CoinsSwapIcon,
  FlashIcon,
  Loading03Icon,
  Settings02Icon,
  ShieldKeyIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import type { Metadata } from 'next'
import { CandyTile } from '@/components/kit/candy-tile'
import { Float } from '@/components/kit/float'
import { HashiMark } from '@/components/kit/hashi-mark'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, AssetOnChain, ChainLogo } from '@/components/kit/logos'
import { MeshCard } from '@/components/kit/mesh-card'
import { StatusPill } from '@/components/kit/status-pill'
import { Button } from '@/components/ui/button'
import {
  ChainsMarqueeDemo,
  ControlsDemo,
  EventsDemo,
  FeedbackDemo,
  LiveRoutesDemo,
  OverlaysDemo,
  TrackerDemo,
} from '@/features/dev/components-demo'
import { LandingDemo } from '@/features/dev/landing-demo'
import { MotionDemo } from '@/features/dev/motion-demo'
import { DevSection } from '@/features/dev/section'
import { SwapPreview } from '@/features/dev/swap-preview'
import { SwapScreenDemo } from '@/features/dev/swap-screen-demo'
import { CANDIES, SWATCHES } from '@/features/dev/tokens'
import { BCH_ASSETS, STABLES } from '@/lib/constants/assets'
import { CHAINS, EXTERNAL_CHAIN_IDS } from '@/lib/constants/chains'

export const metadata: Metadata = {
  title: 'Design system',
  robots: { index: false, follow: false },
}

const SECTIONS = [
  'colour',
  'type',
  'buttons',
  'tiles',
  'logos',
  'swap',
  'surfaces',
  'overlays',
  'controls',
  'routes',
  'feedback',
  'tracker',
  'chains',
  'motion',
  'icons',
  'swap-screen',
  'landing',
] as const

const ICONS = [
  ['BridgeIcon', BridgeIcon],
  ['CoinsSwapIcon', CoinsSwapIcon],
  ['ArrowDataTransferVerticalIcon', ArrowDataTransferVerticalIcon],
  ['Wallet01Icon', Wallet01Icon],
  ['Clock01Icon', Clock01Icon],
  ['CheckmarkCircle02Icon', CheckmarkCircle02Icon],
  ['Alert02Icon', Alert02Icon],
  ['ShieldKeyIcon', ShieldKeyIcon],
  ['FlashIcon', FlashIcon],
  ['Settings02Icon', Settings02Icon],
  ['Loading03Icon', Loading03Icon],
  ['ArrowRight01Icon', ArrowRight01Icon],
] as const

/** Every token and part Hashi is built from, on one page, in whichever theme is active. */
export default function DevPage() {
  const bchStables = Object.values(BCH_ASSETS).filter((a) => a.category)
  return (
    <div className="mx-auto w-full max-w-5xl pt-14">
      <p className="label-mono">/ Dev — design system</p>
      <h1 className="mt-4 max-w-3xl text-display">The vermilion bridge.</h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">
        Cream paper, black ink and one vermilion, with candy colours for chains and states, glossy tiles and
        mono labels. Switch the theme in the nav to see ink.
      </p>
      <nav className="mt-8 flex flex-wrap gap-2">
        {SECTIONS.map((s, i) => (
          <a
            key={s}
            href={`#${s}`}
            className="rounded-full bg-muted px-3.5 py-1.5 font-mono text-muted-foreground text-xs uppercase tracking-[0.08em] transition-colors hover:bg-accent hover:text-foreground"
          >
            {String(i + 1).padStart(2, '0')} {s}
          </a>
        ))}
      </nav>

      <div className="mt-12">
        <DevSection id="colour" index="01" title="Colour" note="Paper and ink are one palette inverted.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SWATCHES.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3"
              >
                <span
                  className="size-14 shrink-0 rounded-xl ring-1 ring-border"
                  style={{ background: `var(${s.cssVar})` }}
                />
                <div className="min-w-0">
                  <p className="font-medium">{s.name}</p>
                  <p className="truncate text-muted-foreground text-sm">{s.role}</p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">
                    {s.light} · {s.dark}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CANDIES.map((c) => (
              <div
                key={c.candy}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3"
              >
                <CandyTile candy={c.candy} size="lg">
                  <Icon icon={CoinsSwapIcon} />
                </CandyTile>
                <div className="min-w-0">
                  <p className="font-medium capitalize">{c.candy}</p>
                  <p className="text-muted-foreground text-sm">{c.use}</p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">{c.stops}</p>
                </div>
              </div>
            ))}
          </div>
        </DevSection>

        <DevSection
          id="type"
          index="02"
          title="Type"
          note="Figtree for words, Geist Mono for numbers and labels."
        >
          <div className="space-y-8 rounded-3xl border border-border bg-card p-8 shadow-card">
            <div>
              <p className="label-mono">Display · Figtree 500 · −4% · 0.97</p>
              <p className="mt-2 text-display">Dollars in, dollars out.</p>
            </div>
            <div>
              <p className="label-mono">Title · Figtree 500 · −4% · 1.1</p>
              <p className="mt-2 text-title">Bring USDC to Bitcoin Cash as PUSD.</p>
            </div>
            <div>
              <p className="label-mono">Body · Figtree 400 · 17px</p>
              <p className="mt-2 max-w-xl text-[1.0625rem] text-muted-foreground">
                Pick an amount and Hashi shows every live route, with what you end up with after every fee and
                how long it takes.
              </p>
            </div>
            <div>
              <p className="label-mono">Amount · Geist Mono 500 · tabular</p>
              <p className="mt-2 text-6xl text-amount">2,480.00</p>
            </div>
            <div>
              <p className="label-mono">Label · Geist Mono · 11px · +8% · upper</p>
              <p className="mt-2 label-mono">/ Best return · 01 — Pay · ~2 min</p>
            </div>
          </div>
        </DevSection>

        <DevSection id="buttons" index="03" title="Buttons" note="Vermilion is the one action per screen.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              Review swap
              <Icon icon={ArrowRight01Icon} />
            </Button>
            <Button variant="secondary">Connect wallet</Button>
            <Button variant="outline">Details</Button>
            <Button variant="soft">Max</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="destructive">Disconnect</Button>
            <Button variant="link">View on explorer</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="soft" aria-label="Settings">
              <Icon icon={Settings02Icon} />
            </Button>
            <Button size="icon-lg" aria-label="Swap">
              <Icon icon={CoinsSwapIcon} />
            </Button>
          </div>
          <div className="mt-5 max-w-sm">
            <Button size="xl">
              <Icon icon={Loading03Icon} className="animate-spin" />
              Waiting for your wallet
            </Button>
          </div>
        </DevSection>

        <DevSection id="tiles" index="04" title="Tiles, pills and labels">
          <div className="mb-6 flex items-end gap-4">
            <HashiMark size="lg" />
            <HashiMark size="md" />
            <HashiMark size="sm" />
            <p className="label-mono pb-1">The mark · 橋, an arched bridge</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {CANDIES.map((c) => (
              <CandyTile key={c.candy} candy={c.candy}>
                <Icon icon={CoinsSwapIcon} />
              </CandyTile>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusPill tone="success" icon={<Icon icon={CheckmarkCircle02Icon} />}>
              Received PUSD
            </StatusPill>
            <StatusPill tone="pending" icon={<Icon icon={Clock01Icon} />}>
              Waiting for 1 confirmation
            </StatusPill>
            <StatusPill tone="warning" icon={<Icon icon={Alert02Icon} />}>
              Taking longer than usual
            </StatusPill>
            <StatusPill tone="error" icon={<Icon icon={Alert02Icon} />}>
              Refunded
            </StatusPill>
            <StatusPill tone="vermilion" icon={<Icon icon={FlashIcon} />}>
              Best return
            </StatusPill>
            <StatusPill tone="ink" icon={<Icon icon={Clock01Icon} />}>
              Fastest
            </StatusPill>
          </div>
          <div className="relative mt-8 flex h-40 items-center justify-center gap-4 overflow-hidden rounded-3xl bg-muted">
            <StatusPill tone="pending" tilt={-8} icon={<Icon icon={Clock01Icon} />}>
              Deposit seen
            </StatusPill>
            <StatusPill tone="vermilion" tilt={6} icon={<Icon icon={CoinsSwapIcon} />}>
              Swapped on Cauldron
            </StatusPill>
            <StatusPill tone="success" tilt={-4} icon={<Icon icon={CheckmarkCircle02Icon} />}>
              PUSD received
            </StatusPill>
          </div>
        </DevSection>

        <DevSection
          id="logos"
          index="05"
          title="Logos"
          note="Real marks for every chain and asset Hashi supports."
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {(['bch', ...EXTERNAL_CHAIN_IDS] as const).map((id) => (
              <div
                key={id}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4"
              >
                <ChainLogo chain={id} size={36} />
                <span className="text-center text-muted-foreground text-xs">{CHAINS[id].name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {(['USDC', 'USDT', 'BCH', 'PUSD', 'MUSD'] as const).map((a) => (
              <span
                key={a}
                className="flex items-center gap-2 rounded-full bg-card py-1.5 pr-4 pl-1.5 font-medium shadow-card"
              >
                <AssetLogo asset={a} size={28} />
                {a}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {STABLES.map((s) => (
              <span key={`${s.symbol}-${s.chain}`} className="flex items-center gap-2 text-sm">
                <AssetOnChain asset={s.symbol} chain={s.chain} size={28} />
                <span>
                  {s.symbol}
                  <span className="text-muted-foreground"> · {CHAINS[s.chain].name}</span>
                </span>
              </span>
            ))}
          </div>
        </DevSection>

        <DevSection
          id="swap"
          index="06"
          title="The swap card"
          note="On the vermilion glow. The amount is live; the quote side shows its loading state."
        >
          <div className="py-10">
            <SwapPreview />
          </div>
        </DevSection>

        <DevSection
          id="surfaces"
          index="07"
          title="Surfaces"
          note="Tilted gradient cards, drawn live. Numbers are Hashi's real coverage."
        >
          <div className="flex flex-wrap items-center justify-center gap-6 py-6">
            <MeshCard palette="vermilion" tilt={-6} className="flex h-64 w-56 flex-col justify-end p-6">
              <p className="font-mono text-white/80 text-xs uppercase tracking-[0.08em]">Chains</p>
              <p className="text-6xl text-amount">{EXTERNAL_CHAIN_IDS.length + 1}</p>
            </MeshCard>
            <MeshCard palette="violet" tilt={4} className="flex h-64 w-56 flex-col justify-end p-6">
              <p className="font-mono text-white/80 text-xs uppercase tracking-[0.08em]">Stablecoins in</p>
              <p className="text-6xl text-amount">{STABLES.length}</p>
            </MeshCard>
            <MeshCard palette="green" tilt={-3} className="flex h-64 w-56 flex-col justify-end p-6">
              <p className="font-mono text-white/80 text-xs uppercase tracking-[0.08em]">BCH stablecoins</p>
              <p className="text-6xl text-amount">{bchStables.length}</p>
            </MeshCard>
          </div>
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-6 rounded-[2.5rem] bg-[#121111] px-6 py-14 text-[#fffaf5]">
            <p className="w-full text-center font-mono text-white/60 text-xs uppercase tracking-[0.08em]">
              01 — Dark chapter · floating cards
            </p>
            {bchStables.map((a, i) => (
              <Float key={a.id} tilt={i % 2 ? 5 : -5} delay={i * 0.8}>
                <div className="w-64 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <AssetLogo asset={a.id} size={36} />
                    <div>
                      <p className="font-medium">{a.id}</p>
                      <p className="text-white/60 text-xs">{a.name}</p>
                    </div>
                  </div>
                  <p className="mt-3 truncate font-mono text-[0.6875rem] text-white/50">
                    {a.category?.slice(0, 8)}…{a.category?.slice(-6)} · {a.decimals} decimals
                  </p>
                </div>
              </Float>
            ))}
          </div>
        </DevSection>

        <DevSection
          id="overlays"
          index="08"
          title="Overlays"
          note="coss ui on Base UI: the token picker as a swipeable bottom sheet with search, the review dialog, a side sheet, popover and tooltip."
        >
          <OverlaysDemo />
        </DevSection>

        <DevSection
          id="controls"
          index="09"
          title="Controls"
          note="Direction tabs and the slippage field (coss ui)."
        >
          <ControlsDemo />
        </DevSection>

        <DevSection
          id="routes"
          index="10"
          title="Route list"
          note="Live quotes. The highlight glides between routes (Motion-Primitives); the best wears a vermilion beam (Magic UI)."
        >
          <LiveRoutesDemo />
        </DevSection>

        <DevSection
          id="feedback"
          index="11"
          title="Feedback"
          note="Toasts for the moments that matter, skeletons and spinners for waiting (coss ui)."
        >
          <FeedbackDemo />
        </DevSection>

        <DevSection
          id="tracker"
          index="12"
          title="Tracker"
          note="The two-chain spine and its live event feed (Magic UI animated list). Specimen states."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <TrackerDemo />
            <EventsDemo />
          </div>
        </DevSection>

        <DevSection
          id="chains"
          index="13"
          title="Chain strip"
          note="For the landing page (Magic UI marquee)."
        >
          <ChainsMarqueeDemo />
        </DevSection>

        <DevSection
          id="motion"
          index="14"
          title="Motion"
          note="Headlines sharpen into place (Motion-Primitives text effect); numbers roll with NumberFlow; the theme spreads from its button (Magic UI)."
        >
          <MotionDemo />
        </DevSection>

        <DevSection id="icons" index="15" title="Icons" note="Hugeicons free set (MIT), 1.75 stroke.">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {ICONS.map(([name, icon]) => (
              <div
                key={name}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <Icon icon={icon} size={24} />
                <span className="w-full truncate text-center font-mono text-[0.625rem] text-muted-foreground">
                  {name.replace('Icon', '')}
                </span>
              </div>
            ))}
          </div>
        </DevSection>

        <DevSection
          id="swap-screen"
          index="16"
          title="Swap screen overlays"
          note="The review sheet on a live quote (specimen addresses: the real one needs both wallets), the WizardConnect dialog (QR on a computer, the wallet app on a phone), and the token picker. Bottom sheets on a phone."
        >
          <SwapScreenDemo />
        </DevSection>

        <DevSection
          id="landing"
          index="17"
          title="Landing parts"
          note="The headline sharpens in CSS (no JavaScript needed, so the largest text paints at once); the bridge beams (Magic UI animated beam); meteors (Magic UI, CSS transforms); the FAQ accordion (coss ui on Base UI)."
        >
          <LandingDemo />
        </DevSection>
      </div>
    </div>
  )
}
