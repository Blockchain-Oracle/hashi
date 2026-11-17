import { cn } from '@/lib/utils'

/**
 * The glow: a vermilion bloom blurred far out behind the main object, wider than the object itself so it
 * spills past its edges. Place it inside a `relative` parent; it never takes pointer events.
 */
export function Glow({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        // Its own GPU layer: the 60px blur is rasterised once instead of on every repaint of what sits above it.
        'pointer-events-none absolute -inset-x-28 top-[4%] -bottom-12 -z-10 transform-gpu rounded-full blur-[60px] will-change-transform',
        'bg-[radial-gradient(closest-side,var(--glow)_0%,var(--glow)_45%,rgb(253_160_48/0.35)_75%,transparent)]',
        className,
      )}
    />
  )
}
