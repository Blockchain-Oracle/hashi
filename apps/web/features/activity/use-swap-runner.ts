'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toastManager } from '@/components/ui/toast'
import { useBchWallet } from '@/features/wallets/bch-wallet'
import { useEvmWallet } from '@/features/wallets/evm-wallet'
import { BCH_ASSETS } from '@/lib/constants/assets'
import { STATUS_POLL_MS } from '@/lib/constants/limits'
import {
  type BchSide,
  checkBridge,
  expireIfStale,
  finishOnCauldron,
  nextStep,
  PriceMovedError,
  quoteDeadline,
  type StepOptions,
  sendDeposit,
} from '@/lib/engine/runner'
import type { SwapRecord, SwapStatus } from '@/lib/engine/swap'
import { celebrate } from '@/lib/feedback'
import { persistSwap, takeAutostart, useSwapRecord } from './store'

export interface RunLog {
  /** When it last happened. */
  at: number
  step: string
  detail: string
  /** How many times in a row the same line came up (a status check retried every few seconds). */
  repeats: number
}

/** The bridge's status could not be read: since when, and the last reason. */
export interface StatusTrouble {
  since: number
  message: string
}

/** Wallets refuse in many words; these are the ones people see. */
function friendly(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/reject|denied|cancel/i.test(message)) return 'You declined in your wallet. Nothing was sent.'
  if (/insufficient funds|exceeds balance/i.test(message))
    return 'Not enough balance (or gas) for this deposit.'
  return message
}

const ANNOUNCE: Partial<
  Record<
    SwapStatus,
    (r: SwapRecord) => { type: 'success' | 'info' | 'error'; title: string; description: string }
  >
> = {
  'deposit-sent': () => ({
    type: 'info',
    title: 'Deposit sent',
    description: 'The bridge will pick it up shortly.',
  }),
  'bch-arrived': (r) => ({
    type: 'info',
    title: 'BCH arrived',
    description: `One approval in your Bitcoin Cash wallet turns it into ${r.bchAsset}.`,
  }),
  completed: (r) => ({
    type: 'success',
    title: 'Swap complete',
    description:
      r.direction === 'out' && r.stable
        ? `${r.stable.symbol} is on its way to your wallet.`
        : `${r.bchAsset === 'BCH' ? 'BCH' : BCH_ASSETS[r.bchAsset].name} is in your wallet.`,
  }),
  refunded: () => ({ type: 'error', title: 'Refunded', description: 'The bridge returned your deposit.' }),
  failed: () => ({ type: 'error', title: 'Swap failed', description: 'Open the swap for details.' }),
  expired: () => ({
    type: 'info',
    title: 'Quote expired',
    description: 'Nothing was sent. Start again for a fresh quote.',
  }),
}

type Accept = NonNullable<StepOptions['accept']>

/**
 * Drives one saved swap: the deposit (one or two wallet approvals), a status check with the bridge every 5 s while
 * it works, and the Cauldron finish for PUSD and MUSD. Every step saves the record first, so closing the tab at
 * any point loses nothing; reopening the swap picks up at the same step.
 */
export function useSwapRunner(id: string) {
  const queryClient = useQueryClient()
  const query = useSwapRecord(id)
  const record = query.data ?? undefined
  const evm = useEvmWallet()
  const { wc, scan, receive } = useBchWallet()
  const [busy, setBusy] = useState<'deposit' | 'finish' | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** After prices moved past the floor: the step to retry and the lower floor it would accept. */
  const [offer, setOffer] = useState<{ kind: 'deposit' | 'finish'; accept: Accept } | null>(null)
  const [log, setLog] = useState<RunLog[]>([])
  const [statusTrouble, setStatusTrouble] = useState<StatusTrouble | null>(null)
  const checking = useRef(false)
  const lastStatus = useRef<SwapStatus | undefined>(undefined)

  const push = useCallback((step: string, detail: string) => {
    setLog((entries) => {
      const last = entries.at(-1)
      // The same line again (a retry every few seconds) counts up instead of filling the log.
      if (last && last.step === step && last.detail === detail) {
        return [...entries.slice(0, -1), { ...last, at: Date.now(), repeats: last.repeats + 1 }]
      }
      return [...entries.slice(-80), { at: Date.now(), step, detail, repeats: 1 }]
    })
  }, [])

  const bch: BchSide | undefined =
    wc.manager && receive
      ? { manager: wc.manager, receive, coins: async () => (await scan.refetch()).data?.utxos ?? [] }
      : undefined

  const run = useCallback(
    async (kind: 'deposit' | 'finish', step: () => Promise<SwapRecord>) => {
      setBusy(kind)
      setError(null)
      setOffer(null)
      try {
        await persistSwap(queryClient, await step())
      } catch (e) {
        const message = friendly(e)
        push('error', message)
        setError(message)
        if (e instanceof PriceMovedError) setOffer({ kind, accept: { stage: e.stage, floor: e.floor } })
      } finally {
        setBusy(null)
      }
    },
    [queryClient, push],
  )

  // Between a sale's two approvals the record is saved, so closing the tab there resumes after the sale.
  const checkpoint = useCallback((next: SwapRecord) => persistSwap(queryClient, next), [queryClient])

  const deposit = useCallback(
    (accept?: Accept) => {
      if (!record) return
      void run('deposit', () =>
        sendDeposit(record, { bch, solana: { send: evm.sendSolanaToken } }, push, {
          checkpoint,
          ...(accept ? { accept } : {}),
        }),
      )
    },
    [record, run, bch, evm.sendSolanaToken, push, checkpoint],
  )

  const finish = useCallback(
    (accept?: Accept) => {
      if (!record) return
      if (!bch) {
        setError('Connect the Bitcoin Cash wallet that received the BCH.')
        return
      }
      void run('finish', () => finishOnCauldron(record, bch, push, accept ? { accept } : {}))
    },
    [record, run, bch, push],
  )

  /** Go ahead at the new price the last attempt reported. */
  const acceptNewPrice = useCallback(() => {
    if (!offer) return
    if (offer.kind === 'deposit') deposit(offer.accept)
    else finish(offer.accept)
  }, [offer, deposit, finish])

  // A swap that has moved nothing ends as expired when its quote runs out, while this page is open too.
  useEffect(() => {
    if (!record) return
    const deadline = quoteDeadline(record)
    if (deadline === undefined) return
    const expire = async () => {
      const next = await expireIfStale(record, Date.now(), push).catch(() => record)
      if (next !== record) await persistSwap(queryClient, next)
    }
    const wait = deadline - Date.now()
    if (wait <= 0) {
      void expire()
      return
    }
    const timer = setTimeout(() => void expire(), Math.min(wait + 1_000, 2_147_483_647))
    return () => clearTimeout(timer)
  }, [record, queryClient, push])

  // A swap just started from the review asks the wallet right away; one reopened later waits for a click.
  useEffect(() => {
    if (record?.status === 'quoted' && takeAutostart(record.id)) deposit()
  }, [record, deposit])

  // While the bridge works: one status check at a time, every 5 s, until an end state.
  useEffect(() => {
    if (!record || nextStep(record) !== 'wait') return
    let stopped = false
    const tick = async () => {
      if (checking.current) return
      checking.current = true
      try {
        const next = await checkBridge(record, push)
        if (!stopped) setStatusTrouble(null)
        if (!stopped && next !== record) await persistSwap(queryClient, next)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        push('status', `check failed, retrying: ${message}`)
        // Kept as state, so the tracker can say plainly that it cannot read the bridge (not that the bridge is slow).
        if (!stopped) setStatusTrouble((t) => ({ since: t?.since ?? Date.now(), message }))
      } finally {
        checking.current = false
      }
    }
    void tick()
    const timer = setInterval(() => void tick(), STATUS_POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [record, queryClient, push])

  // Say each new state out loud once: a toast, and the chime and buzz for the moments that matter.
  useEffect(() => {
    if (!record) return
    const previous = lastStatus.current
    lastStatus.current = record.status
    if (previous === undefined || previous === record.status) return
    const announce = ANNOUNCE[record.status]?.(record)
    if (announce) toastManager.add(announce)
    if (record.status === 'completed') celebrate('success')
    if (['bch-arrived', 'refunded', 'failed'].includes(record.status)) {
      celebrate('attention')
    }
  }, [record])

  return {
    record,
    loading: query.isLoading,
    missing: query.isSuccess && !query.data,
    busy,
    error,
    offer: Boolean(offer),
    log,
    statusTrouble,
    deposit: () => deposit(),
    finish: () => finish(),
    acceptNewPrice,
    bchConnected: Boolean(bch),
    stableConnected: Boolean(
      record?.stable && (record.stable.chain === 'solana' ? evm.solanaAddress : evm.evmAddress),
    ),
  }
}

export type SwapRunner = ReturnType<typeof useSwapRunner>
