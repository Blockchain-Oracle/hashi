import type { BchAssetId } from '@/lib/constants/assets'
import { CAULDRON_LEG_SECONDS } from '@/lib/constants/limits'
import { getRouter, routerAsset } from '@/lib/providers/cauldron'
import {
  minerFeeSats,
  proceedsFromSell,
  routerFeeSats,
  routerFeeTokens,
  spendableForBuy,
} from './cauldron-fees'
import { classify, isPartialFill, tooSmallForCauldron } from './quote'
import type { CauldronLeg, LocalPair, QuoteRequest, Route, RouteOutcome } from './types'

const BPS = 10_000n

/**
 * Prices a swap that stays on Bitcoin Cash (PUSD, MUSD, BCH) on Cauldron alone: one transaction, one approval in
 * the Bitcoin Cash wallet, no bridge. The Router's quotes leave out its 0.1% fee and the miner fee; both are added
 * here, the same way as on the bridged routes, so every route's number is what the person keeps.
 *
 *   BCH → token:    the amount is everything that leaves the wallet; the pools get what remains after the fees.
 *   token → BCH:    the fees come out of the proceeds (the build needs no BCH from the wallet).
 *   token → token:  one "combined" build through both tokens' pools; the Router's fee is 0.1% of the sold token on
 *                   top, and the miner fee comes from plain BCH in the wallet.
 */
export async function quoteLocal(req: QuoteRequest<LocalPair>): Promise<RouteOutcome> {
  const { from, to } = req.pair
  if (from === to) {
    return { ok: false, provider: 'cauldron', reason: 'unsupported', message: 'Pick two different assets' }
  }
  try {
    const priced =
      from === 'BCH'
        ? await buy(to, req.amount)
        : to === 'BCH'
          ? await sell(from, req.amount)
          : await swap(from, to, req.amount)
    if (!priced) return tooSmallForCauldron('cauldron')
    const route: Route = {
      provider: 'cauldron',
      pair: req.pair,
      amountIn: req.amount,
      amountOut: priced.amountOut,
      minAmountOut: (priced.amountOut * (BPS - BigInt(req.slippageBps))) / BPS,
      bridgeSats: 0n,
      cauldron: priced.leg,
      etaSeconds: CAULDRON_LEG_SECONDS,
      signatures: 1,
      quotedAt: Date.now(),
      raw: { bridge: null, cauldron: priced.raw },
    }
    return { ok: true, route }
  } catch (error) {
    return classify('cauldron', error)
  }
}

interface Priced {
  amountOut: bigint
  leg: CauldronLeg
  raw: unknown
}

/** BCH → PUSD or MUSD. Pool count sets the miner fee, so price once, then again with the real count. */
async function buy(token: BchAssetId, amountSats: bigint): Promise<Priced | undefined> {
  const router = getRouter()
  const category = routerAsset(token)
  let spend = spendableForBuy(amountSats, 1)
  if (spend <= 0n) return undefined
  let quote = await router.quote({ sell: 'bch', buy: category, amount: spend, side: 'sell' })
  if (quote.pools > 1) {
    spend = spendableForBuy(amountSats, quote.pools)
    if (spend <= 0n) return undefined
    quote = await router.quote({ sell: 'bch', buy: category, amount: spend, side: 'sell' })
  }
  const tokens = BigInt(quote.output_amount ?? '0')
  if (tokens <= 0n) return undefined
  const tradeSats = BigInt(quote.input_amount ?? spend.toString())
  return {
    amountOut: tokens,
    leg: {
      pools: quote.pools,
      tradeSats,
      routerFeeSats: routerFeeSats(tradeSats),
      minerFeeSats: minerFeeSats(quote.pools),
      ...(quote.market_pre_price ? { marketPrice: quote.market_pre_price } : {}),
      partial: isPartialFill(quote.fill),
    },
    raw: quote,
  }
}

/** PUSD or MUSD → BCH. */
async function sell(token: BchAssetId, amount: bigint): Promise<Priced | undefined> {
  const quote = await getRouter().quote({ sell: routerAsset(token), buy: 'bch', amount, side: 'sell' })
  const outputSats = BigInt(quote.output_amount ?? '0')
  const proceeds = proceedsFromSell(outputSats, quote.pools)
  if (proceeds <= 0n) return undefined
  return {
    amountOut: proceeds,
    leg: {
      pools: quote.pools,
      tradeSats: outputSats,
      routerFeeSats: routerFeeSats(outputSats),
      minerFeeSats: minerFeeSats(quote.pools),
      ...(quote.market_pre_price ? { marketPrice: quote.market_pre_price } : {}),
      partial: isPartialFill(quote.fill),
    },
    raw: quote,
  }
}

/** PUSD ⇄ MUSD in one combined trade. Each token's market price comes from a one-unit quote, for dollar values. */
async function swap(from: BchAssetId, to: BchAssetId, amount: bigint): Promise<Priced | undefined> {
  const router = getRouter()
  const [quote, payPrice, receivePrice] = await Promise.all([
    router.quote({ sell: routerAsset(from), buy: routerAsset(to), amount, side: 'sell' }),
    marketPrice(from),
    marketPrice(to),
  ])
  const out = BigInt(quote.token_b_out ?? quote.output_amount ?? '0')
  if (out <= 0n) return undefined
  return {
    amountOut: out,
    leg: {
      pools: quote.pools,
      tradeSats: 0n,
      routerFeeSats: 0n,
      feeTokens: routerFeeTokens(amount),
      minerFeeSats: minerFeeSats(quote.pools),
      ...(payPrice ? { marketPrice: payPrice } : {}),
      ...(receivePrice ? { receiveMarketPrice: receivePrice } : {}),
      partial: isPartialFill(quote.fill),
    },
    raw: quote,
  }
}

/** Sats per base unit of a token before any trade: the Router's pre-trade price for buying one unit. */
async function marketPrice(token: BchAssetId): Promise<string | undefined> {
  const quote = await getRouter().quote({ sell: 'bch', buy: routerAsset(token), amount: 1n, side: 'buy' })
  return quote.market_pre_price
}
