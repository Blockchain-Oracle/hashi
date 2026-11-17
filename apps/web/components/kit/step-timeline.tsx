'use client'

import { Alert02Icon, ArrowUpRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import type { ChainId } from '@/lib/constants/chains'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import { ChainLogo } from './logos'

/**
 * The swap tracker's spine: one row per step across both chains, each with its chain, its state, when it happened
 * and a link to the transaction. Hand-built glue: no registry has a two-chain stepper on Base UI (coss's stepper
 * is Radix). Styled from the tokens: green done, vermilion active (pulsing), muted pending, red failed.
 */

export type StepState = 'done' | 'active' | 'pending' | 'failed'

export interface TimelineStep {
  id: string
  title: string
  detail?: ReactNode
  chain?: ChainId
  state: StepState
  /** A short time label, e.g. "19:42:08" or "~3 min". */
  at?: string
  href?: string
}

const NODE: Record<StepState, string> = {
  done: 'candy-green text-white shadow-gloss',
  active: 'candy-vermilion text-white shadow-gloss',
  pending: 'bg-muted text-muted-foreground ring-1 ring-border',
  failed: 'candy-red text-white shadow-gloss',
}

export function StepTimeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  const still = useReducedMotion()
  return (
    <ol className={cn('relative', className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        return (
          <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? (
              <span
                aria-hidden
                className="absolute top-9 bottom-1 left-[17px] w-0.5 overflow-hidden rounded-full bg-border"
              >
                <motion.span
                  className="block w-full bg-(--success)"
                  initial={false}
                  animate={{ height: step.state === 'done' ? '100%' : '0%' }}
                  transition={{ duration: still ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            ) : null}
            <span className="relative z-10 shrink-0">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-[11px] text-sm',
                  NODE[step.state],
                )}
              >
                {step.state === 'done' ? (
                  <Icon icon={Tick02Icon} strokeWidth={2.4} />
                ) : step.state === 'failed' ? (
                  <Icon icon={Alert02Icon} strokeWidth={2} />
                ) : (
                  <span className="font-mono text-xs">{i + 1}</span>
                )}
              </span>
              {step.state === 'active' && !still ? (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-[11px] bg-(--vermilion) opacity-30"
                />
              ) : null}
              {step.chain ? (
                <ChainLogo
                  chain={step.chain}
                  size={16}
                  className="absolute -right-1.5 -bottom-1.5 rounded-full ring-2 ring-card"
                />
              ) : null}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-baseline gap-3">
                <p className={cn('font-medium', step.state === 'pending' && 'text-muted-foreground')}>
                  {step.title}
                </p>
                {step.at ? (
                  <span className="ml-auto shrink-0 font-mono text-muted-foreground text-xs">{step.at}</span>
                ) : null}
              </div>
              {step.detail ? <div className="mt-0.5 text-muted-foreground text-sm">{step.detail}</div> : null}
              {step.href ? (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                >
                  View transaction
                  <Icon icon={ArrowUpRight01Icon} />
                </a>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
