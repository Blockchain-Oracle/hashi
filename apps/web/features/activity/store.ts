'use client'

import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { expireIfStale, quoteDeadline } from '@/lib/engine/runner'
import { isTerminal, loadSwap, loadSwaps, type SwapRecord, saveSwap } from '@/lib/engine/swap'

/** Every saved swap, newest first (IndexedDB, this browser only). */
export function useSwapRecords() {
  return useQuery({ queryKey: ['swaps'], queryFn: loadSwaps })
}

export function useSwapRecord(id: string) {
  return useQuery({ queryKey: ['swaps', id], queryFn: async () => (await loadSwap(id)) ?? null })
}

/** Save a new version of a swap and show it everywhere at once. */
export async function persistSwap(queryClient: QueryClient, record: SwapRecord): Promise<void> {
  await saveSwap(record)
  queryClient.setQueryData(['swaps', record.id], record)
  await queryClient.invalidateQueries({ queryKey: ['swaps'], exact: true })
}

/**
 * Swaps started on this page load go straight into their next wallet request (the person just pressed "Start
 * swap"); a swap reopened later waits for a click instead.
 */
const autostart = new Set<string>()

export function markAutostart(id: string) {
  autostart.add(id)
}

export function takeAutostart(id: string): boolean {
  return autostart.delete(id)
}

export function inProgress(records: SwapRecord[] | undefined): SwapRecord[] {
  return records?.filter((r) => !isTerminal(r)) ?? []
}

const SWEEP_MS = 60_000

/**
 * Ends swaps whose quote ran out before anything was sent, so none stays "in progress" for good. Runs wherever the
 * nav is, on load and every minute, so the in-progress count is right on every page.
 */
export function useExpirySweep() {
  const records = useSwapRecords()
  const queryClient = useQueryClient()
  useEffect(() => {
    const sweep = async () => {
      const now = Date.now()
      for (const record of records.data ?? []) {
        const deadline = quoteDeadline(record)
        if (deadline === undefined || now < deadline) continue
        const next = await expireIfStale(record, now, () => {}).catch(() => record)
        if (next !== record) await persistSwap(queryClient, next)
      }
    }
    void sweep()
    const timer = setInterval(() => void sweep(), SWEEP_MS)
    return () => clearInterval(timer)
  }, [records.data, queryClient])
}
