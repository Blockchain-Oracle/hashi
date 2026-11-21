'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type UseWizardConnectResult, useWizardConnect } from '@wizardconnect/react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { toastManager } from '@/components/ui/toast'
import { subscribeAddress } from '@/lib/bch/electrum'
import { scanWallet, type WalletAddress, type WalletScan } from '@/lib/bch/wallet'
import { appIconUrl } from '@/lib/links'
import { BchConnectDialog } from './bch-connect-dialog'

/**
 * The Bitcoin Cash wallet, over WizardConnect (BLAZE's required connection). The session is kept in localStorage,
 * so a returning visitor reconnects without scanning a QR again. Its own storage key keeps it apart from other
 * WizardConnect dapps on the same browser.
 *
 * After a refresh the hook rebuilds the session from storage, but only in an effect after the first render: until
 * then it reports no wallet at all. Hashi reads the stored session itself on the first render, so a returning wallet
 * reads "Reconnecting" (never "Connect a wallet") while that happens. The hook's state then stays "connecting" or
 * "reconnecting", never "connected": on a reconnect the dapp tells the wallet it already knows it, so no new "wallet
 * ready" arrives. That is still a paired wallet, so `paired` counts it, and its addresses and coins show at once.
 *
 * A stored session outlives the wallet's own: a wallet can remove the connection while no Hashi tab is open, and the
 * hook would restore it forever. A live wallet answers the dapp's ping every 10 seconds, so a paired wallet that sent
 * nothing for QUIET_MS is not answering, and the page offers Pair again instead of acting connected.
 */

const SESSION_KEY = 'hashi-wizardconnect'
/** A paired wallet that sent nothing (not even its answer to the 10-second ping) for this long is not answering. */
const QUIET_MS = 25_000
const QUIET_CHECK_MS = 3_000
/** How long a stored session may take to come back before the page stops saying "Reconnecting". */
const RESTORE_GRACE_MS = 10_000
/** Dropping a dead session waits on its relay; past this, the stored session is cleared by hand. */
const REPAIR_TIMEOUT_MS = 4_000

/** The hook's own rule for restoring (loadSession plus a wallet key): only such a session ever comes back. */
function hasStoredSession(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw === null) return false
    const stored = JSON.parse(raw) as { privateKey?: unknown; secret?: unknown; walletPublicKey?: unknown }
    return Boolean(stored.privateKey && stored.secret && stored.walletPublicKey)
  } catch {
    return false
  }
}
const noSubscription = () => () => {}

interface BchWallet {
  wc: UseWizardConnectResult
  /** A wallet is paired: connected now, or a stored session restored after a refresh. */
  paired: boolean
  /** The server's render and the hydration after it: whether a wallet is coming back is not known yet. */
  checking: boolean
  /** A stored session is coming back after a refresh: say "Reconnecting", never ask to connect. */
  restoring: boolean
  /** Paired and heard from lately; false once a paired wallet stopped answering (closed, asleep, or removed Hashi). */
  answering: boolean
  /** Drops a session that is not answering and opens a fresh pairing (a new code). */
  repair: () => void
  /** Addresses and coins, refreshed whenever any of them changes on chain. */
  scan: ReturnType<typeof useQuery<WalletScan>>
  /** The wallet's first receive address: where bridged BCH (q…) and PUSD/MUSD (z…) land. */
  receive: WalletAddress | undefined
  /** Opens the WizardConnect dialog (QR on a computer, the wallet app on a phone). */
  openConnect: () => void
}

const BchWalletContext = createContext<BchWallet | null>(null)

export function BchWalletProvider({ children }: { children: ReactNode }) {
  // The wallet shows the icon on its own screen, so it is a full URL, not a path on this site.
  const wc = useWizardConnect({
    dappName: 'Hashi',
    dappIcon: appIconUrl(),
    sessionKey: SESSION_KEY,
  })
  const { manager, state } = wc
  // A restored session: a manager rebuilt from storage, with no pairing code (only a new pairing shows one).
  const resuming = manager !== null && (state === 'reconnecting' || (state === 'connecting' && !wc.uri))
  const sessionPaths = manager?.getSessionPaths() ?? []
  const paired = manager !== null && (state === 'connected' || (resuming && sessionPaths.length > 0))

  // Before the hook's restore runs, the stored session tells whether a wallet is coming back. The server cannot see
  // localStorage, so its render (and the hydration that reuses it) says null: not known yet, and nothing asks to
  // connect until the browser has looked.
  const stored = useSyncExternalStore(noSubscription, hasStoredSession, () => null)
  const checking = stored === null
  const [graceOver, setGraceOver] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setGraceOver(true), RESTORE_GRACE_MS)
    return () => clearTimeout(timer)
  }, [])
  const restoring = !paired && stored === true && !graceOver && state !== 'disconnected' && !wc.error

  // Liveness: every message from the wallet (its pong, its keys, a signature) counts as hearing from it.
  const heardAt = useRef(Date.now())
  const [quiet, setQuiet] = useState(false)
  useEffect(() => {
    if (!manager) return
    heardAt.current = Date.now()
    setQuiet(false)
    const heard = () => {
      heardAt.current = Date.now()
      setQuiet(false)
    }
    manager.on('messagereceived', heard)
    return () => {
      manager.off('messagereceived', heard)
    }
  }, [manager])
  // The relay closes while the tab is hidden (and reopens when it shows), so no ping is answered then: a hidden tab
  // is never judged, and coming back gives the wallet a fresh window (someone who just approved in their wallet
  // returns to Hashi and must not read "not answering").
  useEffect(() => {
    const check = setInterval(() => {
      if (document.visibilityState === 'visible') setQuiet(Date.now() - heardAt.current > QUIET_MS)
    }, QUIET_CHECK_MS)
    const shown = () => {
      if (document.visibilityState !== 'visible') return
      heardAt.current = Date.now()
      setQuiet(false)
    }
    document.addEventListener('visibilitychange', shown)
    return () => {
      clearInterval(check)
      document.removeEventListener('visibilitychange', shown)
    }
  }, [])
  const answering = paired && !quiet

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

  // Pair again: drop the session that is not answering (its relay and stored keys), then open the dialog, which
  // starts a fresh pairing once the hook is idle. A dead relay could hold the goodbye forever, so past
  // REPAIR_TIMEOUT_MS the stored session is cleared by hand and the page reloads into a clean pairing.
  const repair = useCallback(() => {
    const fallback = setTimeout(() => {
      try {
        localStorage.removeItem(SESSION_KEY)
      } catch {
        // Storage refused: the reload still drops the relay.
      }
      window.location.reload()
    }, REPAIR_TIMEOUT_MS)
    void wc
      .disconnect()
      .then(() => setConnectOpen(true))
      .finally(() => clearTimeout(fallback))
  }, [wc])

  // Every Connect button: a paired wallet that stopped answering is paired again; otherwise the dialog opens.
  const openConnect = useCallback(() => {
    if (paired && !answering) repair()
    else setConnectOpen(true)
  }, [paired, answering, repair])

  // A wallet that ends the session itself (its remove button sends a goodbye) is said, not just shown.
  const wasPaired = useRef(false)
  useEffect(() => {
    if (paired) wasPaired.current = true
    else if (state === 'disconnected' && wasPaired.current) {
      wasPaired.current = false
      toastManager.add({
        type: 'info',
        title: 'Your wallet ended the connection',
        description: 'Connect it again to keep swapping.',
      })
    } else if (state === 'idle') wasPaired.current = false
  }, [paired, state])

  // Kept only while paired, so a disconnect hides the last scan's addresses at once.
  const receive = paired ? scan.data?.addresses.find((a) => a.path === 'receive') : undefined

  const value = useMemo(
    () => ({ wc, paired, checking, restoring, answering, repair, scan, receive, openConnect }),
    [wc, paired, checking, restoring, answering, repair, scan, receive, openConnect],
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
