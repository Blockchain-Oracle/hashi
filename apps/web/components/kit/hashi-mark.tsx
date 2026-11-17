import { cn } from '@/lib/utils'
import { CandyTile } from './candy-tile'

/**
 * The mark: a glossy vermilion tile holding an arched bridge over
 * a waterline — the drum bridges of Japanese gardens, which is what 橋 (hashi) draws. Hand-drawn: no icon set has
 * this shape.
 */
export function HashiMark({ size = 'sm', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <CandyTile candy="vermilion" size={size} className={cn(className)}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-[68%]">
        <path
          d="M3 15.5C6 8.5 18 8.5 21 15.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M8 11.2v4.3M12 9.9v5.6M16 11.2v4.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path d="M2.5 19.5h19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    </CandyTile>
  )
}
