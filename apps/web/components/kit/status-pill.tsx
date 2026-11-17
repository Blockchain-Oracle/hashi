import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Status pills ("Sent BTC", "Received USDC"): a solid candy pill with an icon, optionally tilted. */
export type PillTone = 'success' | 'pending' | 'warning' | 'error' | 'vermilion' | 'ink'

const TONE: Record<PillTone, string> = {
  success: 'candy-green',
  pending: 'candy-violet',
  warning: 'candy-amber',
  error: 'candy-red',
  vermilion: 'candy-vermilion',
  ink: 'candy-ink',
}

export function StatusPill({
  tone,
  icon,
  tilt = 0,
  className,
  children,
}: {
  tone: PillTone
  icon?: ReactNode
  /** Degrees. Pills float at an angle on marketing surfaces, and sit flat in the app. */
  tilt?: number
  className?: string
  children: ReactNode
}) {
  return (
    <span
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 font-medium text-[0.8125rem] text-white shadow-gloss',
        TONE[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
