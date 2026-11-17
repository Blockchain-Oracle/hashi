import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { WalletCoinbase, WalletMetamask, WalletPhantom } from '@web3icons/react'
import type { Route } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { BlurInWords } from '@/components/kit/blur-in-words'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { Iphone } from '@/components/ui/iphone'
import { type BchAssetId, STABLES, type StableSymbol } from '@/lib/constants/assets'
import { CHAINS, type ChainId, type ExternalChainId } from '@/lib/constants/chains'
import { PROVIDERS } from '@/lib/engine/types'
import type { LandingStats } from '@/lib/landing/stats'
import { cn } from '@/lib/utils'

const BCH_WALLETS = [
  { name: 'Selene', src: '/wallets/selene.png' },
  { name: 'Paytaca', src: '/wallets/paytaca.png' },
  { name: 'Cashonize', src: '/wallets/cashonize.png' },
] as const

const usd = (n: number, digits = 2) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

interface FanCard {
  key: string
  asset: StableSymbol | BchAssetId
  chain: ChainId
  title: string
  sub: string
  value: string
  meta: string
  /** Offset from the phone's centre, px; tilt, deg; top, px. */
  x: number
  rot: number
  top: number
  side: 'left' | 'right'
}

/**
 * How many routes start from a stablecoin right now: NEAR Intents always, THORChain when it has a pool for the asset
 * and has not paused that chain (read live with the page).
 */
function routesFrom(data: LandingStats, symbol: StableSymbol, chain: ExternalChainId) {
  const asset = STABLES.find((s) => s.symbol === symbol && s.chain === chain)
  const code = CHAINS[chain].thorchainChain
  if (!asset?.thorchainAsset || !code) return { value: '1 route', meta: 'NEAR Intents' }
  const paused = data.status.thorchainPaused
  if (paused === undefined) return { value: '1 route', meta: 'NEAR Intents' }
  return paused.includes(code)
    ? { value: '1 route', meta: 'THORChain paused' }
    : { value: '2 routes', meta: 'NEAR · THORChain' }
}

/**
 * Transaction cards, in mono, fanned out behind the phone: where dollars come from on the left (with the
 * routes open right now), what they become on the right (priced live on Cauldron and NEAR).
 */
function cards(data: LandingStats): FanCard[] {
  const pusd = data.markets.find((m) => m.id === 'PUSD')
  const musd = data.markets.find((m) => m.id === 'MUSD')
  const pools = (n: number | undefined) => (n === undefined ? 'on Cauldron' : `${n} pools on Cauldron`)
  return [
    {
      key: 'usdc-base',
      asset: 'USDC',
      chain: 'base',
      title: 'USDC',
      sub: 'Base',
      ...routesFrom(data, 'USDC', 'base'),
      x: -330,
      rot: 2,
      top: 96,
      side: 'left',
    },
    {
      key: 'usdt-eth',
      asset: 'USDT',
      chain: 'ethereum',
      title: 'USDT',
      sub: 'Ethereum',
      ...routesFrom(data, 'USDT', 'ethereum'),
      x: -392,
      rot: -6,
      top: 236,
      side: 'left',
    },
    {
      key: 'usdc-sol',
      asset: 'USDC',
      chain: 'solana',
      title: 'USDC',
      sub: 'Solana',
      ...routesFrom(data, 'USDC', 'solana'),
      x: -318,
      rot: 1,
      top: 384,
      side: 'left',
    },
    {
      key: 'pusd',
      asset: 'PUSD',
      chain: 'bch',
      title: 'PUSD',
      sub: 'ParyonUSD',
      value: pusd ? usd(pusd.priceUsd, 4) : '—',
      meta: pools(pusd?.pools),
      x: 336,
      rot: 2,
      top: 80,
      side: 'right',
    },
    {
      key: 'musd',
      asset: 'MUSD',
      chain: 'bch',
      title: 'MUSD',
      sub: 'Moria',
      value: musd ? usd(musd.priceUsd, 4) : '—',
      meta: pools(musd?.pools),
      x: 384,
      rot: -2,
      top: 222,
      side: 'right',
    },
    {
      key: 'bch',
      asset: 'BCH',
      chain: 'bch',
      title: 'BCH',
      sub: 'Bitcoin Cash',
      value: data.bchUsd ? usd(data.bchUsd) : '—',
      meta: 'priced live',
      x: 322,
      rot: 5,
      top: 370,
      side: 'right',
    },
  ]
}

function TxCard({ card, delay }: { card: FanCard; delay: number }) {
  return (
    <div
      className={cn(
        'absolute left-1/2 flex w-[320px] animate-fan-out items-center gap-3 rounded-[1.25rem] bg-card/95 px-4 py-3.5 font-mono shadow-card ring-1 ring-border max-md:hidden',
        card.side === 'left'
          ? '[mask-image:linear-gradient(to_left,black_72%,transparent_100%)]'
          : '[mask-image:linear-gradient(to_right,black_72%,transparent_100%)]',
      )}
      style={
        {
          top: card.top,
          transform: `translateX(calc(-50% + ${card.x}px)) rotate(${card.rot}deg)`,
          animationDelay: `${delay}s`,
        } as CSSProperties
      }
    >
      <AssetOnChain asset={card.asset} chain={card.chain} size={34} />
      <span className="min-w-0">
        <span className="block text-[0.9375rem] text-foreground">{card.title}</span>
        <span className="block truncate text-muted-foreground text-xs">{card.sub}</span>
      </span>
      <span className="ml-auto shrink-0 whitespace-nowrap text-right">
        <span className="block text-[0.9375rem] text-foreground">{card.value}</span>
        <span className="block text-muted-foreground text-xs">{card.meta}</span>
      </span>
    </div>
  )
}

/** The "Also available in" row: the wallets a person already has, on both sides. */
function WalletRow() {
  const tile = 'flex size-10 items-center justify-center rounded-2xl bg-card shadow-card ring-1 ring-border'
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        {[WalletMetamask, WalletPhantom].map((Logo) => (
          <span key={Logo.displayName ?? Logo.name} className={tile}>
            <Logo size={24} variant="branded" />
          </span>
        ))}
        {/* Rabby's inline SVG uses fixed gradient ids (see components/kit/logos.tsx), so it is served as a file. */}
        <span className={tile}>
          <Image src="/logos/rabby.svg" alt="" width={24} height={24} />
        </span>
        <span className={tile}>
          <WalletCoinbase size={24} variant="branded" />
        </span>
        <span className="mx-1.5 h-7 w-px bg-border" aria-hidden />
        {BCH_WALLETS.map((w) => (
          <span key={w.name} className={tile}>
            <Image src={w.src} alt="" width={26} height={26} className="rounded-lg" />
          </span>
        ))}
      </div>
      <p className="font-medium text-foreground/80 text-sm">Works with the wallets you already have</p>
    </div>
  )
}

function Sample({ data }: { data: LandingStats }): ReactNode {
  const s = data.sample
  if (!s) return null
  const href =
    `/swap?from=${s.stable.symbol}.${s.stable.chain}&to=${s.bchAsset}&amount=${s.amountIn}` as Route
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 font-mono text-muted-foreground text-xs transition-colors hover:text-foreground"
    >
      <span className="size-1.5 rounded-full bg-(--success)" />
      Right now: {s.amountIn} USDC → {s.amountOut.toFixed(2)} PUSD, via {PROVIDERS[s.provider].name} +
      Cauldron
      <Icon icon={ArrowRight01Icon} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

/**
 * The hero: a soft sky (Paper Shaders frame), the display headline, then the real product: the
 * live swap screen in a phone on the vermilion glow, with live transaction cards fanning out from behind it.
 */
export function Hero({ data }: { data: LandingStats }) {
  return (
    <section className="relative isolate -mt-[4.125rem] overflow-hidden pt-[4.125rem] pb-6">
      {/* Near the image's own size (1600×860), so the grain stays fine and the warm edges stay in frame. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[56rem] [mask-image:linear-gradient(to_bottom,black_45%,transparent_95%)]"
      >
        <Image
          src="/landing/hero-sky.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-top opacity-95 dark:opacity-[0.07]"
        />
      </div>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 pt-20 text-center sm:pt-28">
        <span className="flex items-center gap-2 rounded-full bg-card/80 py-1.5 pr-3.5 pl-2 font-mono text-[0.6875rem] text-foreground/80 uppercase tracking-[0.08em] shadow-card ring-1 ring-border">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-(--success) opacity-50 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-(--success)" />
          </span>
          Live on mainnet<span className="max-sm:hidden"> · NEAR Intents · THORChain · Cauldron</span>
        </span>
        <BlurInWords
          text="Dollars in, dollars out."
          className="text-balance font-medium text-[3.4rem] leading-[0.95] tracking-[-0.045em] sm:text-[5.5rem] lg:text-[6.5rem]"
        />
      </div>

      <div className="relative mx-auto mt-10 h-[540px] w-full max-w-6xl sm:mt-14 sm:h-[640px]">
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 h-[720px] w-[min(1000px,100%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_47_0/0.62),rgb(255_96_32/0.38)_38%,rgb(253_176_64/0.16)_66%,transparent)] blur-3xl dark:opacity-75"
        />
        {cards(data).map((card, i) => (
          <TxCard key={card.key} card={card} delay={0.35 + i * 0.08} />
        ))}
        <div className="absolute top-0 left-1/2 w-[264px] -translate-x-1/2 sm:w-[312px]">
          <div className="animate-rise drop-shadow-[0_40px_60px_rgb(18_17_17/0.28)]">
            <Iphone
              className="[mask-image:linear-gradient(to_bottom,black_76%,transparent_93%)]"
              screen={
                <>
                  <Image
                    src="/landing/swap-screen.webp"
                    alt="Hashi's swap screen: 100 USDC on Base to PUSD, with live routes"
                    fill
                    loading="eager"
                    fetchPriority="high"
                    sizes="312px"
                    className="object-cover object-top dark:hidden"
                  />
                  <Image
                    src="/landing/swap-screen-dark.webp"
                    alt=""
                    fill
                    loading="eager"
                    sizes="312px"
                    className="hidden object-cover object-top dark:block"
                  />
                </>
              }
            />
          </div>
        </div>
      </div>

      <div className="relative mx-auto -mt-6 flex max-w-2xl flex-col items-center gap-7 px-4 text-center sm:-mt-10">
        <p className="text-balance font-medium text-[1.125rem] text-foreground/70 leading-relaxed tracking-[-0.01em] sm:text-[1.25rem]">
          Bring USDC or USDT from eight chains to Bitcoin Cash as PUSD or MUSD, and back. Every route priced,
          every fee shown, and nothing moves until you approve it in your own wallet.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="h-14 px-8 text-[1.0625rem]"
            nativeButton={false}
            render={<Link href="/swap" />}
          >
            Open the app
            <Icon icon={ArrowRight01Icon} />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-7"
            nativeButton={false}
            render={<a href="#how" />}
          >
            How it works
          </Button>
        </div>
        <Sample data={data} />
        <WalletRow />
      </div>
    </section>
  )
}
