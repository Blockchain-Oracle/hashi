'use client'

import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, AssetOnChain, BrandLogo, ChainLogo } from '@/components/kit/logos'
import { StatusPill } from '@/components/kit/status-pill'
import { StepTimeline } from '@/components/kit/step-timeline'
import { AnimatedBackground } from '@/components/ui/animated-background'
import { AnimatedList } from '@/components/ui/animated-list'
import { BorderBeam } from '@/components/ui/border-beam'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Marquee } from '@/components/ui/marquee'
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { toastManager } from '@/components/ui/toast'
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip'
import { headline, trackerSteps } from '@/features/activity/steps'
import { useRouteQuote } from '@/features/routes/use-route-quotes'
import { BCH_ASSETS, type BchAssetId, STABLES } from '@/lib/constants/assets'
import { CHAINS, EXTERNAL_CHAIN_IDS } from '@/lib/constants/chains'
import { DEFAULT_SLIPPAGE_BPS } from '@/lib/constants/limits'
import { rankRoutes } from '@/lib/engine/rank'
import type { SwapRecord } from '@/lib/engine/swap'
import { PROVIDERS, type QuoteRequest, type RouteOutcome } from '@/lib/engine/types'
import { formatAmount, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Every asset the picker offers: the 14 stablecoins elsewhere, and the Bitcoin Cash side. */
type PickerItem = { id: string; label: string; detail: string; asset: string; chain: keyof typeof CHAINS }
const PICKER_ITEMS: PickerItem[] = [
  ...(['PUSD', 'MUSD', 'BCH'] as BchAssetId[]).map((id) => ({
    id,
    label: id,
    detail: BCH_ASSETS[id].name,
    asset: id,
    chain: 'bch' as const,
  })),
  ...STABLES.map((s) => ({
    id: `${s.symbol}-${s.chain}`,
    label: s.symbol,
    detail: CHAINS[s.chain].name,
    asset: s.symbol,
    chain: s.chain,
  })),
]

/** Overlays: the token picker as a bottom sheet (with search), the review dialog, the side sheet, popover, tooltip. */
export function OverlaysDemo() {
  const [picked, setPicked] = useState<PickerItem>(PICKER_ITEMS[0] as PickerItem)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Drawer>
        <DrawerTrigger render={<Button variant="outline" />}>
          <AssetOnChain asset={picked.asset as BchAssetId} chain={picked.chain} size={22} />
          {picked.label} · {picked.detail}
        </DrawerTrigger>
        <DrawerPopup showBar>
          <DrawerHeader>
            <DrawerTitle>Pick a token</DrawerTitle>
          </DrawerHeader>
          <DrawerPanel>
            <Command
              items={PICKER_ITEMS}
              itemToStringValue={(item: unknown) =>
                `${(item as PickerItem).label} ${(item as PickerItem).detail}`
              }
            >
              <CommandInput placeholder="Search a token or chain" />
              <CommandEmpty>No token by that name</CommandEmpty>
              <CommandList>
                {(item: PickerItem) => (
                  <CommandItem
                    key={item.id}
                    value={item}
                    onClick={() => setPicked(item)}
                    className="gap-3 py-2.5"
                  >
                    <AssetOnChain asset={item.asset as BchAssetId} chain={item.chain} size={28} />
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.detail}</span>
                  </CommandItem>
                )}
              </CommandList>
            </Command>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>

      <Dialog>
        <DialogTrigger render={<Button />}>Review swap</DialogTrigger>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Review your swap</DialogTitle>
            <DialogDescription>Specimen: the review step, before any wallet is asked.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <AssetOnChain asset="USDC" chain="base" size={24} /> You pay on Base
            </p>
            <p className="flex items-center gap-2">
              <AssetOnChain asset="PUSD" chain="bch" size={24} /> You receive on Bitcoin Cash
            </p>
          </DialogPanel>
          <DialogFooter>
            <Button size="lg">Confirm in wallet</Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <Sheet>
        <SheetTrigger render={<Button variant="soft" />}>Route details</SheetTrigger>
        <SheetPopup>
          <SheetHeader>
            <SheetTitle>How this route works</SheetTitle>
          </SheetHeader>
          <SheetPanel className="space-y-3 text-muted-foreground text-sm">
            <p className="flex items-center gap-2">
              <BrandLogo brand="near" size={22} /> NEAR Intents turns your USDC into BCH.
            </p>
            <p className="flex items-center gap-2">
              <BrandLogo brand="cauldron" size={22} /> Cauldron swaps that BCH into PUSD.
            </p>
          </SheetPanel>
        </SheetPopup>
      </Sheet>

      <Popover>
        <PopoverTrigger render={<Button variant="ghost" />}>
          <span className="size-2 rounded-full bg-(--success)" />
          Services
        </PopoverTrigger>
        <PopoverPopup className="w-64 space-y-2 text-sm">
          {(['near', 'thorchain', 'cauldron'] as const).map((b) => (
            <p key={b} className="flex items-center gap-2">
              <BrandLogo brand={b} size={20} />
              <span className="capitalize">
                {b === 'near' ? 'NEAR Intents' : b === 'thorchain' ? 'THORChain' : 'Cauldron'}
              </span>
            </p>
          ))}
        </PopoverPopup>
      </Popover>

      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="About fees" />}>
          <Icon icon={InformationCircleIcon} />
        </TooltipTrigger>
        <TooltipPopup>Every fee is already counted in “You receive”.</TooltipPopup>
      </Tooltip>
    </div>
  )
}

/** Controls: direction tabs, the slippage number field. */
export function ControlsDemo() {
  return (
    <div className="flex flex-wrap items-start gap-8">
      <Tabs defaultValue="in" className="w-80">
        <TabsList className="w-full">
          <TabsTab value="in" className="flex-1">
            Into Bitcoin Cash
          </TabsTab>
          <TabsTab value="out" className="flex-1">
            Out of Bitcoin Cash
          </TabsTab>
        </TabsList>
        <TabsPanel value="in" className="pt-3 text-muted-foreground text-sm">
          USDC or USDT from 8 chains, into PUSD, MUSD or BCH.
        </TabsPanel>
        <TabsPanel value="out" className="pt-3 text-muted-foreground text-sm">
          PUSD, MUSD or BCH, out to USDC or USDT on 8 chains.
        </TabsPanel>
      </Tabs>
      <div className="space-y-2">
        <p className="label-mono">Slippage (%)</p>
        <NumberField defaultValue={DEFAULT_SLIPPAGE_BPS / 100} min={0.1} max={5} step={0.1}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput className="w-20 text-center font-mono" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>
    </div>
  )
}

const LIVE_REQUEST: QuoteRequest = {
  pair: {
    direction: 'in',
    stable: STABLES.find((s) => s.chain === 'ethereum' && s.symbol === 'USDC') as never,
    bchAsset: 'PUSD',
  },
  amount: 100_000_000n,
  slippageBps: DEFAULT_SLIPPAGE_BPS,
}

/** The route list, live: both providers priced now; the highlight glides between rows; the best one wears the beam. */
export function LiveRoutesDemo() {
  const near = useRouteQuote('near', LIVE_REQUEST)
  const thor = useRouteQuote('thorchain', LIVE_REQUEST)
  const outcomes = [near.data, thor.data].filter((o): o is RouteOutcome => Boolean(o))
  const ranked = rankRoutes(outcomes)
  const [selected, setSelected] = useState<string | null>(null)
  const active = selected ?? ranked.bestReturn ?? null

  return (
    <div className="max-w-xl space-y-2">
      <p className="label-mono">/ 100 USDC on Ethereum → PUSD · live</p>
      {ranked.routes.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : (
        <AnimatedBackground
          {...(active ? { defaultValue: active } : {})}
          onValueChange={(id) => setSelected(id)}
          className="rounded-2xl bg-muted"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        >
          {ranked.routes.map((route) => (
            <button
              key={route.provider}
              data-id={route.provider}
              type="button"
              className="w-full rounded-2xl text-left"
            >
              <span className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3">
                {route.provider === ranked.bestReturn ? (
                  <BorderBeam size={80} duration={6} colorFrom="#ff2f00" colorTo="#fdc830" />
                ) : null}
                <BrandLogo brand={route.provider} size={28} />
                <span className="font-medium">{PROVIDERS[route.provider].name}</span>
                {route.provider === ranked.bestReturn ? (
                  <StatusPill tone="vermilion">Best return</StatusPill>
                ) : null}
                <span className="ml-auto text-right">
                  <span className="block font-mono">{formatAmount(route.amountOut, 2, 2)} PUSD</span>
                  <span className="block text-muted-foreground text-xs">
                    {formatDuration(route.etaSeconds)}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </AnimatedBackground>
      )}
      {ranked.unavailable.map((u) => (
        <p key={u.provider} className="px-1 text-muted-foreground text-xs">
          {PROVIDERS[u.provider].name}: {u.message}
        </p>
      ))}
    </div>
  )
}

/** Feedback: toasts for the moments that matter, skeleton and spinner for waiting. */
export function FeedbackDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() =>
          toastManager.add({
            type: 'success',
            title: 'PUSD received',
            description: 'It is in your Bitcoin Cash wallet.',
          })
        }
      >
        Success toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toastManager.add({
            type: 'info',
            title: 'Bridging',
            description: 'NEAR Intents is converting your USDC.',
          })
        }
      >
        Info toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toastManager.add({
            type: 'error',
            title: 'Refunded',
            description: 'Your USDC went back to your wallet.',
          })
        }
      >
        Error toast
      </Button>
      <span className="flex items-center gap-2 text-muted-foreground text-sm">
        <Spinner /> Waiting for your wallet
      </span>
      <Skeleton className="h-10 w-40 rounded-xl" />
    </div>
  )
}

/** Live events slide in one by one (tracker and activity). Specimen events. */
export function EventsDemo() {
  const events = [
    { tone: 'pending' as const, text: 'Deposit seen on Base', at: '19:42:08' },
    { tone: 'pending' as const, text: 'NEAR Intents is converting', at: '19:42:31' },
    { tone: 'success' as const, text: 'BCH arrived · 0.0481 BCH', at: '19:44:55' },
    { tone: 'vermilion' as const, text: 'Swapped on Cauldron · 9.94 PUSD', at: '19:45:10' },
  ]
  return (
    <div className="h-64 overflow-hidden rounded-3xl bg-muted p-4">
      <AnimatedList delay={1400}>
        {events.map((e) => (
          <div
            key={e.text}
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-card"
          >
            <StatusPill tone={e.tone}>
              {e.tone === 'success' ? 'Done' : e.tone === 'vermilion' ? 'Swap' : 'Update'}
            </StatusPill>
            <span className="text-sm">{e.text}</span>
            <span className="ml-auto font-mono text-muted-foreground text-xs">{e.at}</span>
          </div>
        ))}
      </AnimatedList>
    </div>
  )
}

/** Specimen swap (labelled on the page): 3 USDC on Base to PUSD through NEAR Intents, at each stage. */
const SPECIMEN: SwapRecord = {
  id: 'specimen',
  createdAt: Date.UTC(2026, 10, 16, 19, 42, 0),
  updatedAt: Date.UTC(2026, 10, 16, 19, 42, 0),
  provider: 'near',
  direction: 'in',
  stable: { chain: 'base', symbol: 'USDC' },
  bchAsset: 'PUSD',
  amountIn: '3000000',
  approvals: 0,
  addresses: { stableSide: '0x1', bchPlain: 'bitcoincash:q', bchToken: 'bitcoincash:z' },
  depositAddress: '0x0000000000000000000000000000000000000001',
  quoted: { amountOut: '297', minAmountOut: '294', etaSeconds: 160 },
  status: 'quoted',
  events: [],
}

const MINUTE = 60_000

/** The specimen at a stage, with fixed times (one minute per step) so the server and browser draw the same. */
function stageOf(steps: [SwapRecord['status'], string][], patch: Partial<SwapRecord> = {}): SwapRecord {
  const events = steps.map(([status, note], i) => ({
    at: SPECIMEN.createdAt + (i + 1) * MINUTE,
    status,
    note,
  }))
  const last = events.at(-1)
  return {
    ...SPECIMEN,
    ...patch,
    events,
    status: last?.status ?? 'quoted',
    updatedAt: last?.at ?? SPECIMEN.createdAt,
  }
}

const SENT: [SwapRecord['status'], string] = ['deposit-sent', 'Deposit sent to NEAR Intents']
const ARRIVED: [SwapRecord['status'], string] = ['bch-arrived', 'BCH delivered']
const SPECIMEN_TX = { depositTx: '0x0000000000000000000000000000000000000000000000000000000000000001' }

const STAGES: { id: string; label: string; record: SwapRecord }[] = [
  { id: 'quoted', label: 'Deposit', record: SPECIMEN },
  {
    id: 'bridging',
    label: 'Bridging',
    record: stageOf([SENT, ['bridging', 'NEAR Intents is swapping']], SPECIMEN_TX),
  },
  { id: 'arrived', label: 'One approval left', record: stageOf([SENT, ARRIVED], SPECIMEN_TX) },
  {
    id: 'completed',
    label: 'Completed',
    record: stageOf([SENT, ARRIVED, ['completed', 'Swapped into PUSD']], {
      ...SPECIMEN_TX,
      receivedAmount: '297',
    }),
  },
  {
    id: 'refunded',
    label: 'Refunded',
    record: stageOf([SENT, ['refunded', 'Deadline passed before the deposit confirmed']], SPECIMEN_TX),
  },
]

/** The two-chain tracker spine, drawn by the real step model (features/activity/steps.ts) over a specimen swap. */
export function TrackerDemo() {
  const [stage, setStage] = useState('bridging')
  // Times show in the viewer's time zone, which the server cannot know: draw after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const record = (STAGES.find((s) => s.id === stage) ?? STAGES[0])?.record as SwapRecord
  return (
    <div className="max-w-lg rounded-3xl border border-border bg-card p-6 shadow-card">
      <p className="label-mono">Specimen · 3 USDC (Base) → PUSD</p>
      <h3 className="mt-2 font-medium text-xl tracking-[-0.03em]">{headline(record).title}</h3>
      <div className="mt-4 mb-6 flex flex-wrap gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStage(s.id)}
            className={cn(
              'h-8 rounded-full px-3 text-xs transition-colors',
              stage === s.id ? 'bg-foreground text-background' : 'bg-muted hover:bg-accent',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {mounted ? (
        <StepTimeline steps={trackerSteps(record, SPECIMEN.createdAt + 2 * MINUTE)} />
      ) : (
        <Skeleton className="h-64 rounded-2xl" />
      )}
    </div>
  )
}

/** Logo strip for the landing page: every chain Hashi reaches. */
export function ChainsMarqueeDemo() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card py-4">
      <Marquee pauseOnHover className="[--duration:28s]">
        {(['bch', ...EXTERNAL_CHAIN_IDS] as const).map((id) => (
          <span key={id} className="mx-4 flex items-center gap-2 font-medium">
            <ChainLogo chain={id} size={28} />
            {CHAINS[id].name}
          </span>
        ))}
      </Marquee>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-card" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-card" />
      <div className="mt-2 flex justify-center gap-3 text-muted-foreground text-xs">
        {(['PUSD', 'MUSD', 'BCH'] as const).map((a) => (
          <span key={a} className={cn('flex items-center gap-1.5')}>
            <AssetLogo asset={a} size={16} />
            {a}
          </span>
        ))}
      </div>
    </div>
  )
}
