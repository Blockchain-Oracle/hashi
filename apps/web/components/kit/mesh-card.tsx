'use client'

import { MeshGradient } from '@paper-design/shaders-react'
import { useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tilted gradient stat cards, drawn live with Paper Shaders' MeshGradient (WebGL, Apache-2.0).
 * The colour sets are Hashi's candy pairs (violet→pink→orange, green→teal) and Hashi's vermilion.
 */
export const MESH_COLORS = {
  vermilion: ['#ff2f00', '#ff8a3d', '#fdc830', '#b81d79'],
  violet: ['#6900fd', '#b81d79', '#ff563d', '#2b0fa0'],
  green: ['#50b224', '#0ac18e', '#0d5df2', '#01371d'],
} as const

export function MeshCard({
  palette,
  tilt = 0,
  className,
  children,
}: {
  palette: keyof typeof MESH_COLORS
  tilt?: number
  className?: string
  children: ReactNode
}) {
  const still = useReducedMotion()
  return (
    <div
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
      className={cn('relative isolate overflow-hidden rounded-3xl text-white shadow-float', className)}
    >
      <MeshGradient
        className="absolute inset-0 -z-10"
        colors={[...MESH_COLORS[palette]]}
        distortion={0.8}
        swirl={0.35}
        grainOverlay={0.12}
        speed={still ? 0 : 0.35}
      />
      {children}
    </div>
  )
}
