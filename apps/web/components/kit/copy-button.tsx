'use client'

import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from './icon'

/** Copies `value`; the icon turns into a tick for a moment. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : label}
      onClick={() => {
        void navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Icon icon={copied ? Tick02Icon : Copy01Icon} className={cn(copied && 'text-(--success)')} />
    </button>
  )
}
