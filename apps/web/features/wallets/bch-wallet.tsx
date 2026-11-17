'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type UseWizardConnectResult, useWizardConnect } from '@wizardconnect/react'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeAddress } from '@/lib/bch/electrum'
import { scanWallet, type WalletAddress, type WalletScan } from '@/lib/bch/wallet'
import { BchConnectDialog } from './bch-connect-dialog'

/**
 * The Bitcoin Cash wallet, over WizardConnect (BLAZE's required connection). The session is kept in localStorage,
 * so a returning visitor reconnects without scanning a QR again. Its own storage key keeps it apart from other
 * WizardConnect dapps on the same browser.
 */

interface BchWallet {
  wc: UseWizardConnectResult
  /** Addresses and coins, refreshed whenever any of them changes on chain. */
  scan: ReturnType<typeof useQuery<WalletScan>>
  /** The wallet's first receive address: where bridged BCH (q…) and PUSD/MUSD (z…) land. */
  receive: WalletAddress | undefined
  /** Opens the WizardConnect dialog (QR on a computer, the wallet app on a phone). */
  openConnect: () => void
}

const BchWalletContext = createContext<BchWallet | null>(null)

export function BchWalletProvider({ children }: { children: ReactNode }) {
  const wc = useWizardConnect({ dappName: 'Hashi', sessionKey: 'hashi-wizardconnect' })
  const connected = wc.state === 'connected' && wc.manager !== null
  // The receive xpub identifies the wallet; a different wallet means a different scan.
  const walletId = connected ? (wc.manager?.getSessionPaths()[0]?.xpub ?? 'unknown') : 'none'
  const queryClient = useQueryClient()

  const scan = useQuery({
    queryKey: ['bch-wallet', 'scan', walletId],
    queryFn: () => scanWallet(wc.manager as NonNullable<typeof wc.manager>),
    enabled: connected,
    staleTime: 60_000,
  })

  // Follow every address with history: a payment in or out refreshes the scan within seconds.
  const watched = useMemo(() => scan.data?.addresses.map((a) => a.plain) ?? [], [scan.data])
  useEffect(() => {
    if (!watched.length) return
    let cancelled = false
    const stops: (() => void)[] = []
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ['bch-wallet', 'scan', walletId] })
    for (const address of watched) {
      void subscribeAddress(address, refresh).then((stop) => (cancelled ? stop() : stops.push(stop)))
    }
    return () => {
      cancelled = true
      for (const stop of stops) stop()
    }
  }, [watched, walletId, queryClient])

  const [connectOpen, setConnectOpen] = useState(false)
  const openConnect = useCallback(() => setConnectOpen(true), [])
  const receive = scan.data?.addresses.find((a) => a.path === 'receive')

  const value = useMemo(() => ({ wc, scan, receive, openConnect }), [wc, scan, receive, openConnect])
  return (
    <BchWalletContext.Provider value={value}>
      {children}
      <BchConnectDialog wc={wc} open={connectOpen} onOpenChange={setConnectOpen} />
    </BchWalletContext.Provider>
  )
}

export function useBchWallet(): BchWallet {
  const value = useContext(BchWalletContext)
  if (!value) throw new Error('useBchWallet must be used inside BchWalletProvider')
  return value
}
