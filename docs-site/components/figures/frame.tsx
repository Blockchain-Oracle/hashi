"use client"

import { type ReactNode, useRef } from "react"
import { useCompact } from "./use-compact"

/**
 * A figure on a docs page: the drawing (wide, or tall on a phone) on its dot grid, and the numbered steps under it in
 * plain text. `data-figure` names it for the README exports (GIF and still), which capture the drawing alone.
 */
export function FigureFrame({
  name,
  steps,
  wide,
  tall,
  className = "my-8",
}: {
  name: string
  steps?: string[]
  wide: ReactNode
  tall: ReactNode
  className?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const compact = useCompact(box)
  return (
    <figure className={`not-prose ${className}`}>
      <div ref={box} data-figure={name} className="overflow-hidden rounded-xl border border-fd-border bg-[var(--paper)]">
        {compact ? tall : wide}
      </div>
      {steps?.length ? (
        <figcaption className="mt-3 grid gap-x-6 gap-y-2 text-[13.5px] leading-snug text-fd-muted-foreground sm:grid-cols-2">
          {steps.map((line, i) => (
            <span key={line} className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--vermilion)] font-mono text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              {line}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  )
}
