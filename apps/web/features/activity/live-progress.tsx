'use client'

import { BrandLogo, ChainLogo } from '@/components/kit/logos'
import type { SwapRecord } from '@/lib/engine/swap'
import { PROVIDERS } from '@/lib/engine/types'
import { cn } from '@/lib/utils'
import { clock, type LiveProgress } from './progress'

/**
 * The tracker's "now" while a bridge carries the swap: who has it, what they wait for, and the one number that
 * moves. Blocks are counted, not counted down (they come at random); a countdown appears only where the bridge
 * itself gives an estimate, and past it the number counts up in amber instead of claiming "any moment".
 */
export function LiveProgressPanel({
  progress,
  record,
  now,
}: {
  progress: LiveProgress
  record: SwapRecord
  now: number
}) {
  const { countdown, blocks, since } = progress
  let big: string | undefined
  let caption = ''
  let over = false
  if (countdown) {
    const left = countdown.to - now
    over = left < 0
    big = `${over ? '+' : ''}${clock(Math.abs(left))}`
    caption = over ? `over ${countdown.of}` : `left · ${countdown.of}`
  } else if (blocks && blocks.have < blocks.need) {
    big = clock(now - blocks.lastAt)
    caption = 'since the last block'
  } else if (since !== undefined) {
    big = clock(now - since)
    caption = 'waiting'
  }
  const provider = PROVIDERS[record.provider].name
  const back = record.direction === 'out' ? 'the BCH' : `your ${record.stable?.symbol ?? 'deposit'}`

  return (
    <div className="flex flex-col gap-4 rounded-[1.6rem] border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="label-mono flex items-center gap-2">
          {progress.who === 'bch' ? (
            <ChainLogo chain="bch" size={16} />
          ) : (
            <BrandLogo brand={progress.who} size={16} />
          )}
          / Now
        </span>
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-60" aria-live="polite">
          <p className="font-medium text-lg leading-snug">{progress.title}</p>
          <p className="mt-1 text-muted-foreground text-sm">{progress.note}</p>
        </div>
        {big ? (
          <div className="shrink-0 sm:text-right" role="timer" aria-live="off">
            <p
              className={cn(
                'text-amount text-[2.25rem] tabular-nums leading-none sm:text-[2.75rem]',
                over && 'text-(--warning)',
              )}
            >
              {big}
            </p>
            <p className="label-mono mt-1.5">{caption}</p>
          </div>
        ) : null}
      </div>

      {blocks ? (
        <Pipeline
          progress={progress}
          now={now}
          swapLabel={record.provider === 'near' ? 'NEAR swap' : `${provider} swap`}
        />
      ) : countdown?.from !== undefined ? (
        <Bar fill={(now - countdown.from) / (countdown.to - countdown.from)} over={over} />
      ) : null}

      {progress.refundAt ? (
        <p className="text-muted-foreground text-xs">
          Not done by{' '}
          {new Date(progress.refundAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}?{' '}
          {provider} sends {back} back to your wallet.
        </p>
      ) : null}
    </div>
  )
}

/** Block 1 … block N, then the bridge's swap: done segments green, the one under way moving. */
function Pipeline({ progress, now, swapLabel }: { progress: LiveProgress; now: number; swapLabel: string }) {
  const blocks = progress.blocks
  if (!blocks) return null
  const countdown = progress.countdown
  const swapping = blocks.have >= blocks.need
  const swapFill =
    swapping && countdown?.from !== undefined
      ? (now - countdown.from) / (countdown.to - countdown.from)
      : undefined
  const segments = [
    ...Array.from({ length: blocks.need }, (_, i) => ({
      label: `Block ${i + 1}`,
      state: i < blocks.have ? 'done' : i === blocks.have ? 'active' : 'pending',
      fill: undefined as number | undefined,
    })),
    { label: swapLabel, state: swapping ? 'active' : 'pending', fill: swapFill },
  ] as const

  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}>
      {segments.map((segment) => (
        <li key={segment.label} className="flex min-w-0 flex-col gap-1.5">
          {segment.state === 'done' ? (
            <span className="h-2 rounded-full candy-green" />
          ) : segment.state === 'active' && segment.fill !== undefined ? (
            <Bar fill={segment.fill} over={segment.fill > 1} />
          ) : (
            <span className="relative h-2 overflow-hidden rounded-full bg-muted">
              {segment.state === 'active' ? (
                // Under way, with no knowable end (a block): a moving fill, not a fake percentage.
                <span className="absolute inset-y-0 left-0 w-1/2 animate-pulse rounded-full candy-vermilion motion-reduce:animate-none" />
              ) : null}
            </span>
          )}
          <span
            className={cn(
              'truncate font-mono text-[0.6875rem] uppercase tracking-wide',
              segment.state === 'pending' ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {segment.state === 'done' ? '✓ ' : ''}
            {segment.label}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** A bar filled to the bridge's estimate; full and amber once past it. */
function Bar({ fill, over }: { fill: number; over: boolean }) {
  const width = `${Math.round(Math.min(1, Math.max(0.02, fill)) * 100)}%`
  return (
    <span className="relative block h-2 overflow-hidden rounded-full bg-muted">
      <span
        className={cn(
          'absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-linear',
          over ? 'bg-(--warning)' : 'candy-vermilion',
        )}
        style={{ width }}
      />
    </span>
  )
}
