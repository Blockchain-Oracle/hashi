'use client'

import { useReducedMotion } from 'motion/react'
import { type RefObject, useRef } from 'react'
import { HashiMark } from '@/components/kit/hashi-mark'
import { AssetLogo, ChainLogo } from '@/components/kit/logos'
import { AnimatedBeam } from '@/components/ui/animated-beam'
import type { BchAssetId } from '@/lib/constants/assets'
import { CHAINS, EXTERNAL_CHAIN_IDS, type ExternalChainId } from '@/lib/constants/chains'
import { cn } from '@/lib/utils'

const OUT: BchAssetId[] = ['PUSD', 'MUSD', 'BCH']

function Tile({
  tileRef,
  label,
  className,
  children,
}: {
  tileRef: RefObject<HTMLDivElement | null>
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      ref={tileRef}
      title={label}
      className={cn(
        'relative z-10 flex size-11 items-center justify-center rounded-2xl bg-card shadow-card ring-1 ring-border sm:size-14',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * The bridge in one picture (Magic UI's animated beam): eight chains flow into Hashi, and out as PUSD, MUSD or
 * BCH on Bitcoin Cash. Each beam is one small animated gradient; with reduced motion they hold still.
 */
export function BridgeDiagram() {
  const container = useRef<HTMLDivElement>(null)
  const hub = useRef<HTMLDivElement>(null)
  const still = useReducedMotion()
  // Refs are stable across renders; one per tile, made once.
  const chainRefs = useRef(
    Object.fromEntries(EXTERNAL_CHAIN_IDS.map((id) => [id, { current: null }])) as Record<
      ExternalChainId,
      RefObject<HTMLDivElement | null>
    >,
  ).current
  const outRefs = useRef(
    Object.fromEntries(OUT.map((id) => [id, { current: null }])) as Record<
      BchAssetId,
      RefObject<HTMLDivElement | null>
    >,
  ).current

  return (
    <div
      ref={container}
      role="img"
      aria-label="USDC and USDT on eight chains flow through Hashi into PUSD, MUSD or BCH on Bitcoin Cash, and back."
      className="relative mx-auto grid w-full max-w-3xl grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-y-3"
    >
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {EXTERNAL_CHAIN_IDS.map((id) => (
          <Tile key={id} tileRef={chainRefs[id]} label={CHAINS[id].name}>
            <ChainLogo chain={id} size={26} className="sm:size-8" />
          </Tile>
        ))}
      </div>
      <span />
      <div className="flex flex-col items-center gap-2">
        <div ref={hub} className="relative z-10 rounded-[22px] bg-card p-1.5 shadow-float ring-1 ring-border">
          <HashiMark size="lg" />
        </div>
        <span className="label-mono">Hashi</span>
      </div>
      <span />
      <div className="flex flex-col gap-3 sm:gap-4">
        {OUT.map((id) => (
          <div key={id} className="flex items-center gap-2.5">
            <Tile tileRef={outRefs[id]} label={id}>
              <AssetLogo asset={id} size={30} className="sm:size-9" />
            </Tile>
            <span className="font-medium text-sm max-sm:hidden">{id}</span>
          </div>
        ))}
      </div>

      {EXTERNAL_CHAIN_IDS.map((id, i) => (
        <AnimatedBeam
          key={id}
          containerRef={container}
          fromRef={chainRefs[id]}
          toRef={hub}
          curvature={(i % 4) * 18 - 27}
          duration={still ? 0 : 5}
          delay={i * 0.35}
          {...(still ? { repeat: 0 } : {})}
          pathColor="var(--foreground)"
          pathOpacity={0.08}
          gradientStartColor="#ff2f00"
          gradientStopColor="#fdc830"
        />
      ))}
      {OUT.map((id, i) => (
        <AnimatedBeam
          key={id}
          containerRef={container}
          fromRef={hub}
          toRef={outRefs[id]}
          curvature={(i - 1) * -30}
          duration={still ? 0 : 5}
          delay={1 + i * 0.4}
          {...(still ? { repeat: 0 } : {})}
          pathColor="var(--foreground)"
          pathOpacity={0.08}
          gradientStartColor="#fdc830"
          gradientStopColor="#ff2f00"
        />
      ))}
    </div>
  )
}
