import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Glossy icon tiles: a two-stop gradient with a white inner highlight, for chains, assets and states. */
export type Candy = 'vermilion' | 'violet' | 'red' | 'amber' | 'green' | 'ink'

const FILL: Record<Candy, string> = {
  vermilion: 'candy-vermilion',
  violet: 'candy-violet',
  red: 'candy-red',
  amber: 'candy-amber',
  green: 'candy-green',
  ink: 'candy-ink',
}

const SIZE = {
  sm: 'size-7 rounded-[9px] text-sm',
  md: 'size-10 rounded-[12px] text-lg',
  lg: 'size-14 rounded-[16px] text-2xl',
  xl: 'size-[4.5rem] rounded-[20px] text-3xl',
} as const

export function CandyTile({
  candy,
  size = 'md',
  className,
  children,
}: {
  candy: Candy
  size?: keyof typeof SIZE
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center text-white shadow-gloss',
        FILL[candy],
        SIZE[size],
        className,
      )}
    >
      {children}
    </span>
  )
}
