'use client'

import { useQuery } from '@tanstack/react-query'
import { electrumHost, getTipHeight } from '@/lib/bch/electrum'
import { PRICE_STALE_MS, PROVIDER_STATUS_STALE_MS } from '@/lib/constants/limits'
import { getRouter, routerAsset } from '@/lib/providers/cauldron'
import { getNearTokens } from '@/lib/providers/near'
import { getThorInbound } from '@/lib/providers/thorchain'

/** The THORChain chains Hashi uses (its stablecoin pools and Bitcoin Cash). */
export const THOR_CHAINS = ['BCH', 'ETH', 'BASE', 'BSC', 'AVAX'] as const

export type Health = 'up' | 'partial' | 'down' | 'checking'

/** Live health of every service Hashi depends on, each checked on its own (shared by /lab and the swap card). */
export function useProviderHealth() {
  const near = useQuery({
    queryKey: ['near', 'tokens'],
    queryFn: ({ signal }) => getNearTokens(signal),
    staleTime: PRICE_STALE_MS,
    refetchInterval: PRICE_STALE_MS,
  })
  const thor = useQuery({
    queryKey: ['thorchain', 'inbound'],
    queryFn: ({ signal }) => getThorInbound(signal),
    staleTime: PROVIDER_STATUS_STALE_MS,
    refetchInterval: PROVIDER_STATUS_STALE_MS,
  })
  const router = useQuery({
    queryKey: ['cauldron', 'pusd-price'],
    queryFn: async () => {
      const started = performance.now()
      // Buy exactly 1.00 PUSD: the sats it costs is PUSD's price on Cauldron right now.
      const quote = await getRouter().quote({
        sell: 'bch',
        buy: routerAsset('PUSD'),
        amount: 100n,
        side: 'buy',
      })
      return { sats: BigInt(quote.input_amount ?? '0'), ms: Math.round(performance.now() - started) }
    },
    staleTime: PROVIDER_STATUS_STALE_MS,
    refetchInterval: PROVIDER_STATUS_STALE_MS,
  })
  const electrum = useQuery({
    queryKey: ['electrum', 'tip'],
    queryFn: async () => ({ height: await getTipHeight(), host: electrumHost() }),
    refetchInterval: PROVIDER_STATUS_STALE_MS,
  })

  const halted = thor.data
    ?.filter((c) => THOR_CHAINS.includes(c.chain as never) && (c.halted || c.chain_trading_paused))
    .map((c) => c.chain)

  const state = {
    near: near.isError ? 'down' : near.data ? 'up' : 'checking',
    thorchain: thor.isError ? 'down' : !thor.data ? 'checking' : halted?.length ? 'partial' : 'up',
    cauldron: router.isError ? 'down' : router.data ? 'up' : 'checking',
    electrum: electrum.isError ? 'down' : electrum.data ? 'up' : 'checking',
  } satisfies Record<string, Health>

  const all = Object.values(state) as Health[]
  const overall: Health = all.includes('down')
    ? 'down'
    : all.includes('partial')
      ? 'partial'
      : all.includes('checking')
        ? 'checking'
        : 'up'

  return { near, thor, router, electrum, halted: halted ?? [], state, overall }
}
