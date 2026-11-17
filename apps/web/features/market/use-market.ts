'use client'

import { useQuery } from '@tanstack/react-query'
import { type Config, getGasPrice } from '@wagmi/core'
import { useMemo } from 'react'
import type { StableAsset } from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import { SOLANA_SIGNATURE_LAMPORTS, SPL_TOKEN_ACCOUNT_BYTES } from '@/lib/constants/fees'
import { GAS_PRICE_STALE_MS, PRICE_STALE_MS } from '@/lib/constants/limits'
import { depositGas, type UsdPrices } from '@/lib/engine/costs'
import type { ProviderId } from '@/lib/engine/types'
import { wagmiAdapter } from '@/lib/evm/appkit'
import { getNearTokens } from '@/lib/providers/near'
import { getRentExemption } from '@/lib/solana/rpc'

/**
 * Live coin prices, by symbol, from NEAR Intents' token list (the list Hashi already reads for routes). One price
 * per symbol: NEAR prices a coin the same on every chain.
 */
export function usePrices(): UsdPrices | undefined {
  const tokens = useQuery({
    queryKey: ['near', 'tokens'],
    queryFn: ({ signal }) => getNearTokens(signal),
    staleTime: PRICE_STALE_MS,
    refetchInterval: PRICE_STALE_MS,
  })
  return useMemo(() => {
    if (!tokens.data) return undefined
    const prices: Record<string, number> = {}
    for (const t of tokens.data) prices[t.symbol] ??= t.price
    return prices
  }, [tokens.data])
}

export interface DepositFee {
  /** In the paying chain's fee coin, in its smallest unit (wei, lamports). */
  native: bigint
  nativeSymbol: string
  nativeDecimals: number
  usd: number | undefined
}

const SOL_DECIMALS = 9
const EVM_DECIMALS = 18

/**
 * What the person pays in network fees to start each route from `stable`'s chain: measured gas × the chain's live
 * gas price on EVM chains; the signature fee plus the deposit address's token-account rent on Solana.
 */
export function useDepositFees(
  stable: StableAsset | undefined,
  prices: UsdPrices | undefined,
): Partial<Record<ProviderId, DepositFee>> {
  const chain = stable ? CHAINS[stable.chain] : undefined
  const evmChainId = chain && 'evmChainId' in chain ? chain.evmChainId : undefined

  const gasPrice = useQuery({
    queryKey: ['gas-price', evmChainId],
    queryFn: () => getGasPrice(wagmiAdapter?.wagmiConfig as Config, { chainId: evmChainId as number }),
    enabled: Boolean(evmChainId && wagmiAdapter),
    staleTime: GAS_PRICE_STALE_MS,
    refetchInterval: GAS_PRICE_STALE_MS,
  })
  const rent = useQuery({
    queryKey: ['solana', 'rent', SPL_TOKEN_ACCOUNT_BYTES],
    queryFn: ({ signal }) => getRentExemption(SPL_TOKEN_ACCOUNT_BYTES, signal),
    enabled: stable?.chain === 'solana',
    staleTime: Number.POSITIVE_INFINITY,
  })

  return useMemo(() => {
    if (!stable || !chain) return {}
    const nativeUsd = prices?.[chain.nativeSymbol]
    const fees: Partial<Record<ProviderId, DepositFee>> = {}
    if (chain.kind === 'solana') {
      if (rent.data === undefined) return fees
      const native = SOLANA_SIGNATURE_LAMPORTS + rent.data
      fees.near = {
        native,
        nativeSymbol: chain.nativeSymbol,
        nativeDecimals: SOL_DECIMALS,
        usd: nativeUsd === undefined ? undefined : (Number(native) / 10 ** SOL_DECIMALS) * nativeUsd,
      }
      return fees
    }
    if (gasPrice.data === undefined) return fees
    for (const provider of ['near', 'thorchain'] as const) {
      const gas = depositGas(provider, stable)
      if (gas === undefined) continue
      const native = gas * gasPrice.data
      fees[provider] = {
        native,
        nativeSymbol: chain.nativeSymbol,
        nativeDecimals: EVM_DECIMALS,
        usd: nativeUsd === undefined ? undefined : (Number(native) / 10 ** EVM_DECIMALS) * nativeUsd,
      }
    }
    return fees
  }, [stable, chain, prices, gasPrice.data, rent.data])
}
