import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ArtBoard } from '@/features/dev/art-board'

export const metadata: Metadata = { title: 'Artwork sources', robots: { index: false } }

/**
 * Where the landing page's artwork is made: Paper Shaders frames (Apache-2.0) rendered once and saved as images,
 * and the real swap screen at phone size for the device mockup. Kept so every asset can be regenerated.
 */
export default function ArtPage() {
  return (
    <Suspense>
      <ArtBoard />
    </Suspense>
  )
}
