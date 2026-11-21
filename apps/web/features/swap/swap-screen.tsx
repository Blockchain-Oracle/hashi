'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toastManager } from '@/components/ui/toast'
import { ResumeBanner } from '@/features/activity/resume-banner'
import { markAutostart, persistSwap } from '@/features/activity/store'
import { ONE_APPROVAL_SALE } from '@/lib/constants/features'
import { startSwap } from '@/lib/engine/runner'
import { unlockSound } from '@/lib/feedback'
import { SwapCard } from './swap-card'
import type { Swap } from './use-swap'

/**
 * The swap screen's client root. "Start swap" asks the provider for a real quote (NEAR issues a deposit address;
 * THORChain names its vault and memo; nothing moves), saves the swap, and opens its tracker, which asks the wallet
 * for the deposit straight away.
 */
export function SwapScreen({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const start = async (swap: Swap, { gasless }: { gasless: boolean }) => {
    const route = swap.selected
    if (!route || !swap.addresses) return
    unlockSound()
    setConfirming(true)
    try {
      const cost = swap.costs[route.provider]
      const record = await startSwap(
        {
          provider: route.provider,
          pair: swap.pair,
          amount: route.amountIn,
          slippageBps: swap.state.slippageBps,
          addresses: swap.addresses,
          // Selling PUSD or MUSD through NEAR: the sale pays NEAR's deposit address in the same transaction.
          oneApproval: ONE_APPROVAL_SALE,
          // Sent from an exchange or any wallet: no wallet signs the deposit, so nothing to make gasless either.
          gasless: gasless && !swap.selfSend,
          ...(swap.selfSend ? { selfSend: true } : {}),
          quoted: {
            amountOut: route.amountOut.toString(),
            minAmountOut: route.minAmountOut.toString(),
            etaSeconds: route.etaSeconds,
            ...(cost ? { feesUsd: cost.totalUsd } : {}),
          },
          // Into PUSD or MUSD: the swap contract holds the trade to the review's "at least" (one approval).
          ...(route.swapContract &&
          route.pair.direction === 'in' &&
          route.pair.bchAsset !== 'BCH' &&
          route.minBridgeSats
            ? { arrival: { minTokens: route.minAmountOut, minBridgeSats: route.minBridgeSats } }
            : {}),
        },
        () => {},
      )
      await persistSwap(queryClient, record)
      markAutostart(record.id)
      router.push(`/activity/${record.id}`)
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Could not start the swap',
        description: error instanceof Error ? error.message : String(error),
      })
      setConfirming(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <ResumeBanner />
      <SwapCard
        initialQuery={initialQuery}
        onConfirm={(swap, options) => void start(swap, options)}
        confirming={confirming}
      />
    </div>
  )
}
