'use client'

import { GodRays, MeshGradient } from '@paper-design/shaders-react'
import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { SwapCard } from '@/features/swap/swap-card'

/**
 * Each frame is still (speed 0, a fixed `frame`), so a screenshot gives the same image every time.
 * `?show=<name>` pins one artwork at the top-left of the viewport at its export size, for a clean capture.
 */
const ART: Record<string, { w: number; h: number; node: ReactNode }> = {
  'hero-sky': {
    w: 1600,
    h: 860,
    node: (
      <MeshGradient
        style={{ width: '100%', height: '100%' }}
        colors={['#fffaf5', '#ffd9c4', '#f2e3d8', '#ffb08f', '#efe7e0', '#fff4ec']}
        distortion={0.9}
        swirl={0.35}
        grainMixer={0.18}
        grainOverlay={0.32}
        speed={0}
        frame={41000}
      />
    ),
  },
  'ink-dawn': {
    w: 860,
    h: 860,
    node: (
      <GodRays
        style={{ width: '100%', height: '100%' }}
        colorBack="#121111"
        colorBloom="#ff2f00"
        colors={['#ff5a2a', '#fdc830', '#ff2f00', '#f37335']}
        density={0.35}
        spotty={0.25}
        midSize={0.2}
        midIntensity={0.4}
        intensity={0.75}
        bloom={0.55}
        speed={0}
        frame={12000}
      />
    ),
  },
  'pastel-field': {
    w: 1600,
    h: 860,
    node: (
      <MeshGradient
        style={{ width: '100%', height: '100%' }}
        colors={['#fffaf5', '#e9e1f6', '#ffe0cf', '#dcefe2', '#f7efe6']}
        distortion={0.8}
        swirl={0.2}
        grainMixer={0.15}
        grainOverlay={0.25}
        speed={0}
        frame={73000}
      />
    ),
  },
  'swap-screen': {
    w: 390,
    h: 844,
    node: (
      <div className="h-full overflow-hidden bg-background px-3 pt-14">
        <SwapCard initialQuery="from=USDC.base&to=PUSD&amount=100" syncUrl={false} />
      </div>
    ),
  },
}

export function ArtBoard() {
  const show = useSearchParams().get('show')
  const pinned = show ? ART[show] : undefined
  if (pinned) {
    return (
      <div
        id={`art-${show}`}
        className="fixed top-0 left-0 z-[100] bg-background"
        style={{ width: pinned.w, height: pinned.h }}
      >
        {pinned.node}
      </div>
    )
  }
  return (
    <div className="flex flex-col items-start gap-10 py-10">
      {Object.entries(ART).map(([name, art]) => (
        <section key={name} className="flex flex-col gap-2">
          <a href={`?show=${name}`} className="label-mono hover:text-foreground">
            {name} · {art.w} × {art.h} · open alone
          </a>
          <div style={{ width: art.w, height: art.h }}>{art.node}</div>
        </section>
      ))}
    </div>
  )
}
