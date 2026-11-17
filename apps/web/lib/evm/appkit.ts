import { arbitrum, avalanche, base, bsc, mainnet, optimism, polygon, solana } from '@reown/appkit/networks'
import type { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { env } from '@/lib/env'

/**
 * Reown AppKit's recommended multichain setup (docs: appkit/shared/multichain): one wagmi adapter for the EVM
 * chains and one Solana adapter, created once. Without a Reown project ID there is no AppKit; the app says so
 * instead of failing.
 */

export const reownProjectId = env.NEXT_PUBLIC_REOWN_PROJECT_ID

type AppKitOptions = Parameters<typeof createAppKit>[0]

/**
 * AppKit's own types are not written for `exactOptionalPropertyTypes` (which Hashi uses), so its adapters and
 * networks are cast to AppKit's parameter types once, here, at the library boundary.
 */
export type AppKitAdapters = NonNullable<AppKitOptions['adapters']>

/** Every chain Hashi takes stablecoins from, in the order the picker shows them. */
export const appkitNetworks = [
  base,
  mainnet,
  arbitrum,
  optimism,
  polygon,
  avalanche,
  bsc,
  solana,
] as unknown as AppKitOptions['networks']

export const wagmiAdapter = reownProjectId
  ? new WagmiAdapter({ ssr: true, projectId: reownProjectId, networks: appkitNetworks })
  : undefined

export const solanaAdapter = reownProjectId ? new SolanaAdapter() : undefined
