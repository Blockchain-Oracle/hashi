import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { WalletWalletConnect } from '@web3icons/react'
import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, BrandLogo } from '@/components/kit/logos'
import { cn } from '@/lib/utils'

interface Partner {
  name: string
  role: string
  href: string
  logo: ReactNode
  /** The card's face: a brand colour or one of Hashi's candy gradients. */
  fill: string
}

const PARTNERS: Partner[] = [
  {
    name: 'NEAR Intents',
    role: 'Carries dollars between chains through a network of solvers.',
    href: 'https://near-intents.org',
    logo: <BrandLogo brand="near" size={52} />,
    fill: 'bg-[linear-gradient(160deg,#1c1c1c,#050505)] text-white',
  },
  {
    name: 'THORChain',
    role: 'Swaps native assets across chains through its own pools.',
    href: 'https://thorchain.org',
    logo: <BrandLogo brand="thorchain" size={52} />,
    fill: 'bg-[linear-gradient(160deg,#0f3d3a,#071a19)] text-white',
  },
  {
    name: 'Cauldron',
    role: 'The Bitcoin Cash DEX where PUSD and MUSD trade.',
    href: 'https://cauldron.quest',
    logo: <BrandLogo brand="cauldron" size={52} />,
    fill: 'candy-violet text-white',
  },
  {
    name: 'WizardConnect',
    role: 'Connects Bitcoin Cash wallets. Every approval stays in the wallet.',
    href: 'https://docs.riftenlabs.com/wizardconnect',
    logo: <Image src="/brands/wizardconnect.png" alt="" width={52} height={52} />,
    fill: 'bg-[linear-gradient(160deg,#3d3ab8,#1f1c6e)] text-white',
  },
  {
    name: 'Reown AppKit',
    role: 'WalletConnect and browser wallets on EVM chains and Solana.',
    href: 'https://reown.com/appkit',
    logo: <WalletWalletConnect size={52} variant="branded" />,
    fill: 'bg-[linear-gradient(160deg,#4fa7ff,#1f6fe0)] text-white',
  },
  {
    name: 'ParyonUSD',
    role: 'PUSD: Bitcoin Cash’s dollar, borrowed against BCH.',
    href: 'https://paryonusd.com',
    logo: <AssetLogo asset="PUSD" size={52} />,
    fill: 'candy-amber text-white',
  },
  {
    name: 'Moria',
    role: 'MUSD: minted against BCH collateral.',
    href: 'https://moria.money',
    logo: <AssetLogo asset="MUSD" size={52} />,
    fill: 'candy-green text-white',
  },
]

/** Where each card sits on the arc: turned away the further it is from the centre, and pushed back. */
function arc(i: number, n: number): CSSProperties {
  const offset = i - (n - 1) / 2
  return {
    '--arc': `rotateY(${offset * -11}deg) translateZ(${-Math.abs(offset) * 34}px) translateY(${Math.abs(offset) * 10}px)`,
    zIndex: 10 - Math.abs(offset),
  } as CSSProperties
}

/**
 * The partners wall as a cover-flow: the services Hashi stands on, as tall brand cards on a 3D arc that turn
 * to face you under the pointer. Below 1280px it is a swipeable row.
 */
export function BuiltOn() {
  return (
    <section id="built-on" className="relative scroll-mt-24 overflow-hidden pt-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4 text-center">
        <p className="label-mono">/ Built on</p>
        <h2 className="text-balance font-normal text-[2.25rem] leading-[1.1] tracking-[-0.04em] sm:text-[3rem]">
          The best of both sides, wired together.
        </h2>
      </div>

      <div className="relative mt-16">
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 h-80 w-[60rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_47_0/0.18),transparent)] blur-2xl"
        />
        <ul className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pt-2 pb-16 [scrollbar-width:none] xl:justify-center xl:gap-0 xl:overflow-visible xl:px-0 xl:[perspective:1600px]">
          {PARTNERS.map((p, i) => (
            <li
              key={p.name}
              className="shrink-0 snap-center transition-transform duration-500 ease-out xl:-mx-2 xl:[transform:var(--arc)] xl:hover:z-20 xl:hover:[transform:none]"
              style={arc(i, PARTNERS.length)}
            >
              <a
                href={p.href}
                className={cn(
                  'group flex h-[17rem] w-[12.5rem] flex-col justify-between rounded-[1.75rem] p-5 shadow-[0_30px_60px_-24px_rgb(18_17_17/0.5)] ring-1 ring-white/10 transition-transform duration-500 hover:-translate-y-2',
                  p.fill,
                )}
              >
                <span className="flex items-start justify-between">
                  <span className="rounded-[1.1rem] bg-white p-2 shadow-card">{p.logo}</span>
                  <Icon
                    icon={ArrowUpRight01Icon}
                    className="opacity-50 transition-opacity group-hover:opacity-100"
                  />
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="font-medium text-[1.3125rem] tracking-[-0.03em]">{p.name}</span>
                  <span className="text-sm leading-snug opacity-75">{p.role}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="mx-auto mt-0 max-w-xl text-balance px-4 text-center font-mono text-foreground/80 text-sm leading-relaxed">
        Every service here runs on mainnet today. Hashi adds no fee of its own:{' '}
        <span className="text-muted-foreground">what you see in a route is what the providers charge.</span>
      </p>
    </section>
  )
}
