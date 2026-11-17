'use client'

import { useQuery } from '@tanstack/react-query'
import { type Config, getBalance, readContracts } from '@wagmi/core'
import { useMemo } from 'react'
import { type Address, erc20Abi } from 'viem'
import { totals } from '@/lib/bch/funding'
import { BCH_ASSETS, type BchAssetId, STABLES, type StableAsset } from '@/lib/constants/assets'
import { CHAINS, type ChainId, EXTERNAL_CHAIN_IDS } from '@/lib/constants/chains'
import { BALANCE_REFETCH_MS } from '@/lib/constants/limits'
import { wagmiAdapter } from '@/lib/evm/appkit'
import { getLamports, getSplBalance } from '@/lib/solana/rpc'
import { useBchWallet } from './bch-wallet'
import { useEvmWallet } from './evm-wallet'

/** `USDC.base`, `USDT.ethereum`, … for a stablecoin elsewhere; `PUSD`, `MUSD`, `BCH` on Bitcoin Cash. */
export type AssetKey = string

export function stableKey(stable: Pick<StableAsset, 'symbol' | 'chain'>): AssetKey {
  return `${stable.symbol}.${stable.chain}`
}

export interface Balances {
  /** What each connected wallet holds, in base units. Missing = not connected or not read yet. */
  assets: ReadonlyMap<AssetKey, bigint>
  /** The fee coin on each chain (wei, lamports, or spendable sats on Bitcoin Cash). */
  native: ReadonlyMap<ChainId, bigint>
}

const EVM_STABLES = STABLES.filter((s) => CHAINS[s.chain].kind === 'evm')
const SOLANA_STABLES = STABLES.filter((s) => s.chain === 'solana')
const EVM_CHAIN_IDS = EXTERNAL_CHAIN_IDS.filter((id) => CHAINS[id].kind === 'evm')

function evmChainId(chain: ChainId): number {
  return (CHAINS[chain] as { evmChainId: number }).evmChainId
}

/**
 * Balances from all three sides at once: USDC/USDT and the fee coin on seven EVM chains (one batched read per
 * chain), USDC/USDT and SOL on Solana, and BCH, PUSD and MUSD from the Bitcoin Cash wallet's own coin scan.
 */
export function useBalances(): Balances {
  const { evmAddress, solanaAddress } = useEvmWallet()
  const { scan } = useBchWallet()

  const evm = useQuery({
    queryKey: ['balances', 'evm', evmAddress],
    enabled: Boolean(evmAddress && wagmiAdapter),
    refetchInterval: BALANCE_REFETCH_MS,
    queryFn: async () => {
      const config = wagmiAdapter?.wagmiConfig as Config
      const owner = evmAddress as Address
      const [tokens, natives] = await Promise.all([
        readContracts(config, {
          allowFailure: true,
          contracts: EVM_STABLES.map((s) => ({
            chainId: evmChainId(s.chain),
            address: s.address as Address,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [owner] as const,
          })),
        }),
        Promise.allSettled(
          EVM_CHAIN_IDS.map((chain) => getBalance(config, { address: owner, chainId: evmChainId(chain) })),
        ),
      ])
      const assets = new Map<AssetKey, bigint>()
      tokens.forEach((r, i) => {
        const s = EVM_STABLES[i]
        if (s && r.status === 'success') assets.set(stableKey(s), r.result as bigint)
      })
      const native = new Map<ChainId, bigint>()
      natives.forEach((r, i) => {
        const chain = EVM_CHAIN_IDS[i]
        if (chain && r.status === 'fulfilled') native.set(chain, r.value.value)
      })
      return { assets, native }
    },
  })

  const solana = useQuery({
    queryKey: ['balances', 'solana', solanaAddress],
    enabled: Boolean(solanaAddress),
    refetchInterval: BALANCE_REFETCH_MS,
    queryFn: async ({ signal }) => {
      const owner = solanaAddress as string
      const [tokens, lamports] = await Promise.all([
        Promise.allSettled(SOLANA_STABLES.map((s) => getSplBalance(owner, s.address, signal))),
        getLamports(owner, signal),
      ])
      const assets = new Map<AssetKey, bigint>()
      tokens.forEach((r, i) => {
        const s = SOLANA_STABLES[i]
        if (s && r.status === 'fulfilled') assets.set(stableKey(s), r.value)
      })
      return { assets, native: new Map<ChainId, bigint>([['solana', lamports]]) }
    },
  })

  return useMemo(() => {
    const assets = new Map<AssetKey, bigint>([...(evm.data?.assets ?? []), ...(solana.data?.assets ?? [])])
    const native = new Map<ChainId, bigint>([...(evm.data?.native ?? []), ...(solana.data?.native ?? [])])
    if (scan.data) {
      const sum = totals(scan.data.utxos)
      native.set('bch', sum.sats)
      assets.set('BCH', sum.sats)
      for (const id of ['PUSD', 'MUSD'] as const satisfies BchAssetId[]) {
        assets.set(id, sum.tokens.get(BCH_ASSETS[id].category) ?? 0n)
      }
    }
    return { assets, native }
  }, [evm.data, solana.data, scan.data])
}
