import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/shell/site-header'
import { BchWalletProvider } from '@/features/wallets/bch-wallet'
import { EvmWalletProvider } from '@/features/wallets/evm-wallet'

/**
 * The app's routes. Wallet connections live here, not in the root layout, so the landing page never loads
 * wallet code.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <EvmWalletProvider>
      <BchWalletProvider>
        {/* The glows behind the swap card and a finished swap bleed past a phone's edges: clipped here (clip, not
            hidden, so the page does not become a scroll box and the sticky nav keeps working). */}
        <div className="flex min-h-dvh flex-col overflow-x-clip">
          <SiteHeader />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 sm:px-6">{children}</main>
        </div>
      </BchWalletProvider>
    </EvmWalletProvider>
  )
}
