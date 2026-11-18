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
 *
 * After a refresh the hook rebuilds the session from storage: the wallet's keys are back at once, while the relay
 * reconnects behind the scenes. The hook's state then stays "connecting" (no pairing code) or "reconnecting", never
 * "connected": on a reconnect the dapp tells the wallet it already knows it, so no new "wallet ready" arrives. That is
 * still a paired wallet, so `paired` counts it, and its addresses and coins show at once.
 */

interface BchWallet {
  wc: UseWizardConnectResult
  /** A wallet is paired: connected now, or a stored session restored after a refresh. */
  paired: boolean
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
  const { manager, state } = wc
  // A restored session: a manager rebuilt from storage, with no pairing code (only a new pairing shows one).
  const resuming = manager !== null && (state === 'reconnecting' || (state === 'connecting' && !wc.uri))
  const sessionPaths = manager?.getSessionPaths() ?? []
  const paired = manager !== null && (state === 'connected' || (resuming && sessionPaths.length > 0))
  // The receive xpub identifies the wallet; a different wallet means a different scan.
  const walletId = paired ? (sessionPaths[0]?.xpub ?? 'unknown') : 'none'
  const queryClient = useQueryClient()

  const scan = useQuery({
    queryKey: ['bch-wallet', 'scan', walletId],
    queryFn: () => scanWallet(manager as NonNullable<typeof manager>),
    enabled: paired,
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
  // Kept only while paired, so a disconnect hides the last scan's addresses at once.
  const receive = paired ? scan.data?.addresses.find((a) => a.path === 'receive') : undefined

  const value = useMemo(
    () => ({ wc, paired, scan, receive, openConnect }),
    [wc, paired, scan, receive, openConnect],
  )
  return (
    <BchWalletContext.Provider value={value}>
      {children}
      <BchConnectDialog wc={wc} paired={paired} open={connectOpen} onOpenChange={setConnectOpen} />
    </BchWalletContext.Provider>
  )
}

export function useBchWallet(): BchWallet {
  const value = useContext(BchWalletContext)
  if (!value) throw new Error('useBchWallet must be used inside BchWalletProvider')
  return value
}
