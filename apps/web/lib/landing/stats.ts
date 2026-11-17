import 'server-only'
import { z } from 'zod'
import { BCH_ASSETS, STABLES, type StableAsset } from '@/lib/constants/assets'
import { CAULDRON_INDEXER_URL } from '@/lib/constants/providers'
import { routeCosts } from '@/lib/engine/costs'
import { quoteRoute } from '@/lib/engine/quote'
import type { Route } from '@/lib/engine/types'
import { fetchJson } from '@/lib/http'
import { getNearTokens } from '@/lib/providers/near'
import { getThorHaltedChains } from '@/lib/providers/thorchain'

/**
 * The landing page's live numbers, read on the server and cached with the page (it regenerates every minute):
 * Cauldron's pools, 24 h volume and price for PUSD and MUSD (Riften's indexer), BCH's price (NEAR Intents' token
 * list), each provider's health, and one real route quote. Every source fails on its own: a slow provider hides
 * its own number, never the page.
 */

const SATS_PER_BCH = 1e8
const TIMEOUT_MS = 6000

const poolsSchema = z.object({ active: z.array(z.object({ sats: z.number(), tokens: z.number() })) })
const volumeSchema = z.object({ volume_sats: z.number(), volume_tokens: z.number() })
const priceSchema = z.object({ price: z.number() })

export interface TokenMarket {
  id: 'PUSD' | 'MUSD'
  name: string
  pools: number
  /** Value locked in Cauldron pools for this token (both sides), in USD. */
  liquidityUsd: number
  /** BCH traded through its pools in the last 24 hours, in USD. */
  volume24hUsd: number
  /** One token in USD at Cauldron's current price. */
  priceUsd: number
}

export interface LandingSample {
  stable: Pick<StableAsset, 'symbol' | 'chain'>
  amountIn: number
  amountOut: number
  bchAsset: 'PUSD'
  provider: Route['provider']
  etaSeconds: number
  /** Provider and pool fees, before gas on the paying chain. */
  feesUsd: number | undefined
  /** The same fees, line by line (bridge, Cauldron). */
  feeLines: { id: 'bridge' | 'cauldron' | 'network'; usd: number }[]
}

export interface LandingStats {
  bchUsd: number | undefined
  markets: TokenMarket[]
  sample: LandingSample | undefined
  status: { near: boolean; thorchainPaused: string[] | undefined; cauldron: boolean }
  checkedAt: number
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), TIMEOUT_MS)),
  ])
}

async function market(id: 'PUSD' | 'MUSD', bchUsd: number): Promise<TokenMarket> {
  const category = BCH_ASSETS[id].category
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  const base = `${CAULDRON_INDEXER_URL}/cauldron`
  const [pools, volume, price] = await Promise.all([
    fetchJson('Cauldron indexer', `${base}/pool/active?token=${category}`, poolsSchema, { signal }),
    fetchJson('Cauldron indexer', `${base}/volume/${category}`, volumeSchema, { signal }),
    fetchJson('Cauldron indexer', `${base}/price/${category}/current`, priceSchema, { signal }),
  ])
  const satUsd = bchUsd / SATS_PER_BCH
  // Price is sats per token base unit (0.01 PUSD/MUSD).
  const unitUsd = price.price * satUsd
  const sats = pools.active.reduce((sum, p) => sum + p.sats, 0)
  const tokens = pools.active.reduce((sum, p) => sum + p.tokens, 0)
  return {
    id,
    name: BCH_ASSETS[id].name,
    pools: pools.active.length,
    liquidityUsd: sats * satUsd + tokens * unitUsd,
    volume24hUsd: volume.volume_sats * satUsd,
    priceUsd: unitUsd * 10 ** BCH_ASSETS[id].decimals,
  }
}

/** One real route right now: 100 USDC on Base to PUSD (price only; nothing is sent). */
async function sample(prices: Record<string, number>): Promise<LandingSample | undefined> {
  const stable = STABLES.find((s) => s.chain === 'base' && s.symbol === 'USDC')
  if (!stable) return undefined
  const outcome = await withTimeout(
    quoteRoute('near', {
      pair: { direction: 'in', stable, bchAsset: 'PUSD' },
      amount: 100n * 10n ** BigInt(stable.decimals),
      slippageBps: 100,
    }),
  )
  if (!outcome.ok) return undefined
  const { route } = outcome
  const costs = routeCosts(route, prices)
  return {
    stable: { symbol: stable.symbol, chain: stable.chain },
    amountIn: 100,
    amountOut: Number(route.amountOut) / 10 ** BCH_ASSETS.PUSD.decimals,
    bchAsset: 'PUSD',
    provider: route.provider,
    etaSeconds: route.etaSeconds,
    feesUsd: costs?.totalUsd,
    feeLines: costs?.lines.map((l) => ({ id: l.id, usd: l.usd })) ?? [],
  }
}

export async function getLandingStats(): Promise<LandingStats> {
  const tokens = await getNearTokens(AbortSignal.timeout(TIMEOUT_MS)).catch(() => undefined)
  const prices: Record<string, number> = {}
  for (const t of tokens ?? []) prices[t.symbol] ??= t.price
  const bchUsd = prices.BCH

  const [pusd, musd, quote, halted] = await Promise.allSettled([
    bchUsd ? market('PUSD', bchUsd) : Promise.reject(new Error('no BCH price')),
    bchUsd ? market('MUSD', bchUsd) : Promise.reject(new Error('no BCH price')),
    tokens ? sample(prices) : Promise.resolve(undefined),
    withTimeout(getThorHaltedChains()),
  ])

  const markets = [pusd, musd].flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  return {
    bchUsd,
    markets,
    sample: quote.status === 'fulfilled' ? quote.value : undefined,
    status: {
      near: Boolean(tokens),
      thorchainPaused: halted.status === 'fulfilled' ? [...halted.value] : undefined,
      cauldron: markets.length > 0,
    },
    checkedAt: Date.now(),
  }
}
