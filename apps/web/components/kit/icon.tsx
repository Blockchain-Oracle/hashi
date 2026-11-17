import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react'

/** Hugeicons (free set, MIT) at Hashi's default weight. Size follows the surrounding text unless given. */
export function Icon({ size = '1.15em', strokeWidth = 1.75, ...props }: HugeiconsIconProps) {
  return <HugeiconsIcon aria-hidden size={size} strokeWidth={strokeWidth} {...props} />
}
