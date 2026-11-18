'use client'

import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useDisconnect,
} from '@reown/appkit/react'
import { type Provider as SolanaProvider, useAppKitConnection } from '@reown/appkit-adapter-solana/react'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from 'react'
import { WagmiProvider } from 'wagmi'
import { useTheme } from '@/components/shell/use-theme'
import { env } from '@/lib/env'
import {
  type AppKitAdapters,
  appkitNetworks,
  reownProjectId,
  solanaAdapter,
  wagmiAdapter,
} from '@/lib/evm/appkit'
import { appIconUrl } from '@/lib/links'
import { splTransferTransaction } from '@/lib/solana/transfer'
import { currentTheme } from '@/lib/theme'

/** Hashi's vermilion in each theme (the dark one is lifted for contrast on ink). */
const ACCENT = { light: '#FF2F00', dark: '#FF4419' } as const

/**
 * EVM and Solana wallets through Reown AppKit (WalletConnect plus browser wallets). `createAppKit` may run only
 * once per page, so it runs here at module load, as Reown's Next.js guide does. Email and social logins, AppKit's
 * own swap and on-ramp screens, and analytics are off: Hashi connects self-custody wallets and keeps every flow on
 * its own pages.
 */
const appKit =
  reownProjectId && wagmiAdapter && solanaAdapter
    ? createAppKit({
        adapters: [wagmiAdapter, solanaAdapter] as unknown as AppKitAdapters,
        networks: appkitNetworks,
        projectId: reownProjectId,
        metadata: {
          name: 'Hashi',
          description: 'Stablecoins from any chain to Bitcoin Cash, as PUSD or MUSD, and back.',
          url: typeof window === 'undefined' ? env.NEXT_PUBLIC_SITE_URL : window.location.origin,
          // Shown by the wallet on its connect and approve screens, so it must be a full URL.
          icons: [appIconUrl()],
        },
        features: {
          analytics: false,
          email: false,
          socials: false,
          swaps: false,
          onramp: false,
          history: false,
        },
        themeMode: currentTheme(),
        themeVariables: {
          '--w3m-accent': ACCENT[currentTheme()],
          '--w3m-font-family': 'var(--font-figtree), system-ui, sans-serif',
          '--w3m-border-radius-master': '3px',
        },
      })
    : undefined

export type EvmNamespace = 'eip155' | 'solana'

export interface SolanaTokenTransfer {
  mint: string
  to: string
  amount: bigint
  decimals: number
}

interface EvmWallet {
  /** False until a Reown project ID is set: there is no AppKit without one. */
  enabled: boolean
  evmAddress: string | undefined
  solanaAddress: string | undefined
  connect: (namespace: EvmNamespace) => void
  disconnect: (namespace: EvmNamespace) => void
  /** Sends USDC/USDT from the connected Solana wallet (one approval); resolves to the transaction signature. */
  sendSolanaToken: (transfer: SolanaTokenTransfer) => Promise<string>
}

const DISABLED: EvmWallet = {
  enabled: false,
  evmAddress: undefined,
  solanaAddress: undefined,
  connect: () => {},
  disconnect: () => {},
  sendSolanaToken: () => Promise.reject(new Error('Wallets are not set up')),
}

const EvmWalletContext = createContext<EvmWallet>(DISABLED)

export function EvmWalletProvider({ children }: { children: ReactNode }) {
  if (!wagmiAdapter) return <EvmWalletContext.Provider value={DISABLED}>{children}</EvmWalletContext.Provider>
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <AccountBridge>{children}</AccountBridge>
    </WagmiProvider>
  )
}

/** Reads AppKit's accounts once, for the whole app; rendered only when AppKit exists. */
function AccountBridge({ children }: { children: ReactNode }) {
  // AppKit's modal follows Hashi's light/dark switch, set once per change through the AppKit instance itself.
  // (`useAppKitTheme()` hands back new setter functions on every render; an effect keyed on them re-ran forever,
  // and each run rewrote AppKit's <style> tags: ~1,300 style rewrites a second, which froze the page.)
  const theme = useTheme()
  useEffect(() => {
    appKit?.setThemeMode(theme)
    appKit?.setThemeVariables({ '--w3m-accent': ACCENT[theme] })
  }, [theme])

  const evm = useAppKitAccount({ namespace: 'eip155' })
  const sol = useAppKitAccount({ namespace: 'solana' })
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()

  // Reown's documented Solana pattern: AppKit's connection plus the wallet provider for the solana namespace.
  const { connection } = useAppKitConnection()
  const { walletProvider: solanaProvider } = useAppKitProvider<SolanaProvider>('solana')
  const solanaOwner = sol.isConnected ? sol.address : undefined
  const sendSolanaToken = useCallback(
    async (transfer: SolanaTokenTransfer) => {
      if (!solanaProvider || !connection || !solanaOwner) throw new Error('Connect a Solana wallet first')
      const transaction = await splTransferTransaction({ connection, owner: solanaOwner, ...transfer })
      const result: unknown = await solanaProvider.signAndSendTransaction(transaction)
      // Most wallets answer with the signature; Coinbase's wraps it in an object.
      return typeof result === 'string' ? result : (result as { signature: string }).signature
    },
    [solanaProvider, connection, solanaOwner],
  )
  const value = useMemo<EvmWallet>(
    () => ({
      enabled: true,
      evmAddress: evm.isConnected ? evm.address : undefined,
      solanaAddress: sol.isConnected ? sol.address : undefined,
      connect: (namespace) => void open({ view: 'Connect', namespace }),
      disconnect: (namespace) => void disconnect({ namespace }),
      sendSolanaToken,
    }),
    [evm.isConnected, evm.address, sol.isConnected, sol.address, open, disconnect, sendSolanaToken],
  )
  return <EvmWalletContext.Provider value={value}>{children}</EvmWalletContext.Provider>
}

export function useEvmWallet(): EvmWallet {
  return useContext(EvmWalletContext)
}
