'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/** Floating cards: tilted, drifting a few pixels up and down, each on its own rhythm. */
export function Float({
  tilt = 0,
  drift = 6,
  duration = 6,
  delay = 0,
  className,
  children,
}: {
  tilt?: number
  drift?: number
  duration?: number
  delay?: number
  className?: string
  children: ReactNode
}) {
  const still = useReducedMotion()
  return (
    <motion.div
      className={className}
      style={{ rotate: tilt }}
      animate={still ? { y: 0 } : { y: [0, -drift, 0] }}
      transition={{ duration, delay, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}
