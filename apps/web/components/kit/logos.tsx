import {
  NetworkArbitrumOne,
  NetworkAvalanche,
  NetworkBase,
  NetworkBinanceSmartChain,
  NetworkBitcoinCash,
  NetworkEthereum,
  NetworkNearProtocol,
  NetworkOptimism,
  TokenBCH,
  TokenUSDC,
  TokenUSDT,
} from '@web3icons/react'
import Image from 'next/image'
import type { ComponentType } from 'react'
import type { BchAssetId, StableSymbol } from '@/lib/constants/assets'
import type { ChainId } from '@/lib/constants/chains'
import { cn } from '@/lib/utils'

/**
 * Real marks only. Stablecoin, BCH and chain logos come from web3icons (MIT). PUSD and MUSD use the icons their
 * issuers publish in their token metadata (BCMR): paryonusd.com/logo.svg and meta.moria.money/m1.png.
 *
 * Solana, Polygon and THORChain are served as files (`public/logos`, rendered once from the same web3icons): their
 * inline SVGs define gradients by fixed ids, so every copy on a page points at the first one, and when that first copy
 * sits inside something hidden (`display: none`) Chrome paints the others blank.
 */

type Svg = ComponentType<{
  size?: number | string
  variant?: 'branded' | 'mono' | 'background'
  className?: string
}>

const CHAIN_LOGO: Record<ChainId, Svg | string> = {
  bch: NetworkBitcoinCash,
  base: NetworkBase,
  ethereum: NetworkEthereum,
  arbitrum: NetworkArbitrumOne,
  optimism: NetworkOptimism,
  polygon: '/logos/polygon.svg',
  avalanche: NetworkAvalanche,
  bsc: NetworkBinanceSmartChain,
  solana: '/logos/solana.svg',
}

const SVG_ASSET: Partial<Record<StableSymbol | BchAssetId, Svg>> = {
  USDC: TokenUSDC,
  USDT: TokenUSDT,
  BCH: TokenBCH,
}

const IMAGE_ASSET: Partial<Record<BchAssetId, string>> = {
  PUSD: '/tokens/pusd.svg',
  MUSD: '/tokens/musd.png',
}

export function ChainLogo({
  chain,
  size = 24,
  className,
}: {
  chain: ChainId
  size?: number
  className?: string
}) {
  const Logo = CHAIN_LOGO[chain]
  if (typeof Logo === 'string') {
    return (
      <Image
        src={Logo}
        alt=""
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full', className)}
      />
    )
  }
  return <Logo size={size} variant="branded" className={cn('shrink-0 rounded-full', className)} />
}

export function AssetLogo({
  asset,
  size = 32,
  className,
}: {
  asset: StableSymbol | BchAssetId
  size?: number
  className?: string
}) {
  const src = IMAGE_ASSET[asset as BchAssetId]
  if (src) {
    return (
      <Image src={src} alt="" width={size} height={size} className={cn('shrink-0 rounded-full', className)} />
    )
  }
  const Logo = SVG_ASSET[asset]
  if (!Logo) return null
  return <Logo size={size} variant="branded" className={cn('shrink-0', className)} />
}

/** The asset's logo with its chain's logo badged at the lower right. */
export function AssetOnChain({
  asset,
  chain,
  size = 32,
  className,
}: {
  asset: StableSymbol | BchAssetId
  chain: ChainId
  size?: number
  className?: string
}) {
  const badge = Math.round(size * 0.46)
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <AssetLogo asset={asset} size={size} />
      <span
        className="absolute -right-1 -bottom-1 rounded-full bg-card p-px ring-2 ring-card"
        style={{ width: badge, height: badge }}
      >
        <ChainLogo chain={chain} size={badge - 2} />
      </span>
    </span>
  )
}

/** The services Hashi routes through. Cauldron's mark is the icon its own app serves (app.cauldron.quest). */
export function BrandLogo({
  brand,
  size = 24,
  className,
}: {
  brand: 'near' | 'thorchain' | 'cauldron'
  size?: number
  className?: string
}) {
  if (brand === 'near') {
    return (
      <NetworkNearProtocol size={size} variant="branded" className={cn('shrink-0 rounded-full', className)} />
    )
  }
  return (
    <Image
      src={brand === 'cauldron' ? '/brands/cauldron.png' : '/logos/thorchain.svg'}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full', className)}
    />
  )
}
