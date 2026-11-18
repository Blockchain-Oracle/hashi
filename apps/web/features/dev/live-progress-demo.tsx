'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { LiveProgressPanel } from '@/features/activity/live-progress'
import { type BridgeReading, type ChainReading, liveProgress } from '@/features/activity/progress'
import { advance, type SwapRecord } from '@/lib/engine/swap'
import { cn } from '@/lib/utils'

/**
 * The tracker's live panel at each moment of a real sale (0.48 PUSD → USDC on Base through NEAR, 2026-11-18):
 * the model in features/activity/progress.ts fed the readings Hashi took that day, with the clock running.
 */

const SENT = Date.UTC(2026, 10, 18, 18, 6, 12)
const BLOCK_1 = Date.UTC(2026, 10, 18, 18, 6, 34)
const BLOCK_2 = Date.UTC(2026, 10, 18, 18, 23, 59)
const PROCESSING = Date.UTC(2026, 10, 18, 18, 33, 39)

const SALE: SwapRecord = {
  id: 'specimen-sale',
  createdAt: SENT - 110_000,
  updatedAt: SENT,
  provider: 'near',
  direction: 'out',
  stable: { chain: 'base', symbol: 'USDC' },
  bchAsset: 'PUSD',
  amountIn: '48',
  approvals: 1,
  addresses: { stableSide: '0x1', bchPlain: 'bitcoincash:q', bchToken: 'bitcoincash:z' },
  depositAddress: 'bitcoincash:qdeposit',
  bchTxid: 'ca03',
  bridgeQuote: { quote: { timeEstimate: 109 }, quoteRequest: { deadline: '2026-11-18T22:04:27.458Z' } },
  status: 'deposit-sent',
  events: [{ at: SENT, status: 'deposit-sent', note: 'BCH deposit sent' }],
}
const PENDING: BridgeReading = { at: SENT, near: { status: 'PENDING_DEPOSIT', updatedAt: SENT } }
const SWAPPING: BridgeReading = { at: PROCESSING, near: { status: 'PROCESSING', updatedAt: PROCESSING } }

interface Moment {
  id: string
  label: string
  record: SwapRecord
  bridge: BridgeReading
  chain: ChainReading | null
  /** Where the clock starts, so each moment shows what that minute looked like. */
  at: number
}

const MOMENTS: Moment[] = [
  {
    id: 'mempool',
    label: 'Sent',
    record: SALE,
    bridge: PENDING,
    chain: { tip: 977_917, tipAt: SENT - 37 * 60_000, depositHeight: 0 },
    at: SENT + 15_000,
  },
  {
    id: 'block-1',
    label: 'Block 1',
    record: SALE,
    bridge: PENDING,
    chain: { tip: 977_918, tipAt: BLOCK_1, depositHeight: 977_918 },
    at: BLOCK_1 + 14 * 60_000,
  },
  {
    id: 'taking',
    label: 'Block 2',
    record: SALE,
    bridge: PENDING,
    chain: { tip: 977_919, tipAt: BLOCK_2, depositHeight: 977_918 },
    at: BLOCK_2 + 4 * 60_000,
  },
  {
    id: 'swapping',
    label: 'NEAR swaps',
    record: advance(SALE, 'bridging', 'NEAR Intents is swapping'),
    bridge: SWAPPING,
    chain: { tip: 977_919, tipAt: BLOCK_2, depositHeight: 977_918 },
    at: PROCESSING + 40_000,
  },
  {
    id: 'over',
    label: 'Past the estimate',
    record: advance(SALE, 'bridging', 'NEAR Intents is swapping'),
    bridge: SWAPPING,
    chain: { tip: 977_919, tipAt: BLOCK_2, depositHeight: 977_918 },
    at: PROCESSING + 140_000,
  },
]

export function LiveProgressDemo() {
  const [moment, setMoment] = useState('block-1')
  const [started, setStarted] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  // Clocks read the viewer's time zone and the running second: draw after mount.
  useEffect(() => {
    setStarted(Date.now())
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  const chosen = MOMENTS.find((m) => m.id === moment) ?? (MOMENTS[0] as Moment)
  const progress = liveProgress(chosen.record, chosen.bridge, chosen.chain)
  const now = chosen.at + (started === null ? 0 : tick * 1000)

  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-card">
      <p className="label-mono">Specimen · 0.48 PUSD → USDC (Base), 18 Nov 2026</p>
      <div className="flex flex-wrap gap-1.5">
        {MOMENTS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMoment(m.id)
              setTick(0)
            }}
            className={cn(
              'h-8 rounded-full px-3 text-xs transition-colors',
              moment === m.id ? 'bg-foreground text-background' : 'bg-muted hover:bg-accent',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      {started !== null && progress ? (
        <LiveProgressPanel progress={progress} record={chosen.record} now={now} />
      ) : (
        <Skeleton className="h-52 rounded-[1.6rem]" />
      )}
    </div>
  )
}
