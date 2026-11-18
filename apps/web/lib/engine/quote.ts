import { NEAR_BCH_ASSET_ID, THORCHAIN_BCH_ASSET } from '@/lib/constants/assets'
import { CHAINS, type ChainInfo } from '@/lib/constants/chains'
import { ONE_APPROVAL_SALE, SWAP_ON_ARRIVAL } from '@/lib/constants/features'
import { ARRIVAL_RESERVE_SATS, BCH_SEND_FEE_SATS } from '@/lib/constants/fees'
import {
  BCH_BLOCK_SECONDS,
  CAULDRON_LEG_SECONDS,
  NEAR_BCH_CONFIRMATIONS,
  NEAR_DEADLINE_MS,
  NEAR_UTXO_DEADLINE_MS,
} from '@/lib/constants/limits'
import { ProviderError } from '@/lib/http'
import { getRouter, RouterError, routerAsset } from '@/lib/providers/cauldron'
import { BelowMinimumError, getNearQuote } from '@/lib/providers/near'
import {
  getThorHaltedChains,
  getThorQuote,
  isThorHaltError,
  THORCHAIN_DECIMALS,
} from '@/lib/providers/thorchain'
import { minerFeeSats, proceedsFromSell, routerFeeSats, spendableForBuy } from './cauldron-fees'
import { PLACEHOLDER_ADDRESS } from './placeholders'
import type { BridgePair, CauldronLeg, ProviderId, QuoteRequest, RouteOutcome, RouteVia } from './types'

/**
 * Prices one route end to end: the bridge leg (NEAR Intents or THORChain, stablecoin ⇄ BCH) chained with the
 * Cauldron leg (BCH ⇄ PUSD/MUSD) when the Bitcoin Cash side is a token. Price only: nothing here issues a deposit
 * address or moves funds. Every fee the providers leave out (the Router's 0.1%, the miner fee) is added here.
 */
export async function quoteRoute(
  provider: ProviderId,
  req: QuoteRequest<BridgePair>,
  signal?: AbortSignal,
): Promise<RouteOutcome> {
  if (provider === 'thorchain' && !req.pair.stable.thorchainAsset) {
    const chain = CHAINS[req.pair.stable.chain].name
    return {
      ok: false,
      provider,
      reason: 'unsupported',
      message: `THORChain has no ${req.pair.stable.symbol} pool on ${chain}`,
    }
  }
  try {
    if (provider === 'thorchain') {
      const paused = await pausedThorChain(req)
      if (paused)
        return { ok: false, provider, reason: 'halted', message: `THORChain has paused ${paused} trading` }
    }
    const route =
      req.pair.direction === 'in'
        ? await quoteIn(provider, req, signal)
        : await quoteOut(provider, req, signal)
    return route
  } catch (error) {
    return classify(provider, error)
  }
}

const BPS = 10_000n

async function quoteIn(
  provider: ProviderId,
  req: QuoteRequest<BridgePair>,
  signal?: AbortSignal,
): Promise<RouteOutcome> {
  const { stable, bchAsset } = req.pair
  const kind = CHAINS[stable.chain].kind
  const bchRecipient = req.addresses?.bchPlain ?? PLACEHOLDER_ADDRESS.bch
  const now = Date.now()

  let bridgeSats: bigint
  let minBridgeSats: bigint
  let etaSeconds: number
  let usdIn: number | undefined
  let usdOut: number | undefined
  let expiresAt: number | undefined
  let rawBridge: unknown

  if (provider === 'near') {
    const response = await getNearQuote(
      {
        dry: true,
        swapType: 'EXACT_INPUT',
        originAsset: stable.nearAssetId,
        destinationAsset: NEAR_BCH_ASSET_ID,
        amount: req.amount,
        recipient: bchRecipient,
        refundTo: req.addresses?.stableSide ?? PLACEHOLDER_ADDRESS[kind],
        slippageBps: req.slippageBps,
        deadline: new Date(now + NEAR_DEADLINE_MS),
      },
      signal,
    )
    bridgeSats = BigInt(response.quote.amountOut)
    minBridgeSats = BigInt(response.quote.minAmountOut)
    etaSeconds = response.quote.timeEstimate
    usdIn = Number(response.quote.amountInUsd)
    usdOut = Number(response.quote.amountOutUsd)
    rawBridge = response
  } else {
    const amount = toThorUnits(req.amount, stable.decimals)
    const quote = await getThorQuote(
      {
        fromAsset: stable.thorchainAsset as string,
        toAsset: THORCHAIN_BCH_ASSET,
        amount,
        ...(req.addresses ? { destination: req.addresses.bchPlain } : {}),
        toleranceBps: req.slippageBps,
      },
      signal,
    )
    const minimum = quote.recommended_min_amount_in ? BigInt(quote.recommended_min_amount_in) : 0n
    if (amount < minimum) {
      return {
        ok: false,
        provider,
        reason: 'below-minimum',
        message: 'Below THORChain’s minimum for this route',
        minimum: fromThorUnits(minimum, stable.decimals),
      }
    }
    bridgeSats = BigInt(quote.expected_amount_out)
    minBridgeSats = (bridgeSats * (BPS - BigInt(req.slippageBps))) / BPS
    etaSeconds = quote.total_swap_seconds ?? 0
    expiresAt = quote.expiry * 1000
    rawBridge = quote
  }

  // Into PUSD or MUSD: the swap contract trades the BCH with no wallet approval, while Hashi's keeper is up.
  const contract = bchAsset !== 'BCH' && SWAP_ON_ARRIVAL && req.swapContract !== false
  const tokenSigs = bchAsset === 'BCH' || contract ? 0 : 1
  const base = {
    provider,
    pair: req.pair,
    amountIn: req.amount,
    bridgeSats,
    minBridgeSats,
    ...(usdIn === undefined ? {} : { usdIn }),
    ...(usdOut === undefined ? {} : { usdOut }),
    quotedAt: now,
    ...(expiresAt === undefined ? {} : { expiresAt }),
    // NEAR: one transfer. THORChain: approve, then depositWithExpiry.
    signatures: (provider === 'near' ? 1 : 2) + tokenSigs,
    ...(contract ? { swapContract: true } : {}),
  }

  if (bchAsset === 'BCH') {
    return {
      ok: true,
      route: {
        ...base,
        amountOut: bridgeSats,
        minAmountOut: minBridgeSats,
        etaSeconds,
        raw: { bridge: rawBridge },
      },
    }
  }

  // Buy tokens with the bridged BCH. Pool count changes the miner fee, so price once, then again with the real count.
  const category = routerAsset(bchAsset)
  const router = getRouter()
  // The swap contract's longer unlock keeps a few hundred sats out of the pools; the review counts it too.
  const available = contract ? bridgeSats - ARRIVAL_RESERVE_SATS : bridgeSats
  let spend = spendableForBuy(available, 1)
  if (spend <= 0n) return tooSmallForCauldron(provider)
  let cauldron = await router.quote({ sell: 'bch', buy: category, amount: spend, side: 'sell' })
  if (cauldron.pools > 1) {
    spend = spendableForBuy(available, cauldron.pools)
    cauldron = await router.quote({ sell: 'bch', buy: category, amount: spend, side: 'sell' })
  }
  const tokens = BigInt(cauldron.output_amount ?? '0')
  if (tokens <= 0n) return tooSmallForCauldron(provider)
  const tradeSats = BigInt(cauldron.input_amount ?? spend.toString())
  const leg: CauldronLeg = {
    pools: cauldron.pools,
    tradeSats,
    routerFeeSats: routerFeeSats(tradeSats),
    minerFeeSats: minerFeeSats(cauldron.pools),
    ...(cauldron.market_pre_price ? { marketPrice: cauldron.market_pre_price } : {}),
    partial: isPartialFill(cauldron.fill),
  }
  return {
    ok: true,
    route: {
      ...base,
      amountOut: tokens,
      // The bridge's floor, then the Cauldron buy's own slippage: the runner builds that buy with this floor.
      minAmountOut: (((tokens * minBridgeSats) / bridgeSats) * (BPS - BigInt(req.slippageBps))) / BPS,
      cauldron: leg,
      etaSeconds: etaSeconds + CAULDRON_LEG_SECONDS,
      raw: { bridge: rawBridge, cauldron },
    },
  }
}

async function quoteOut(
  provider: ProviderId,
  req: QuoteRequest<BridgePair>,
  signal?: AbortSignal,
): Promise<RouteOutcome> {
  const { stable, bchAsset } = req.pair
  const kind = CHAINS[stable.chain].kind
  const now = Date.now()
  /** Selling PUSD or MUSD through NEAR: the sale pays NEAR's deposit address, one approval in all. */
  const saleIsDeposit = bchAsset !== 'BCH' && provider === 'near' && ONE_APPROVAL_SALE

  let bridgeSats = req.amount
  let leg: CauldronLeg | undefined
  let rawCauldron: unknown
  if (bchAsset !== 'BCH') {
    const cauldron = await getRouter().quote({
      sell: routerAsset(bchAsset),
      buy: 'bch',
      amount: req.amount,
      side: 'sell',
    })
    const outputSats = BigInt(cauldron.output_amount ?? '0')
    // Sell the tokens, then the proceeds go to the bridge: in the sale itself through NEAR (ONE_APPROVAL_SALE), or
    // in a second transaction (whose fee is kept back here) through THORChain.
    bridgeSats = proceedsFromSell(outputSats, cauldron.pools) - BCH_SEND_FEE_SATS
    if (bridgeSats <= 0n) return tooSmallForCauldron(provider)
    leg = {
      pools: cauldron.pools,
      tradeSats: outputSats,
      routerFeeSats: routerFeeSats(outputSats),
      minerFeeSats: minerFeeSats(cauldron.pools),
      ...(cauldron.market_pre_price ? { marketPrice: cauldron.market_pre_price } : {}),
      partial: false,
    }
    rawCauldron = cauldron
  }

  let amountOut: bigint
  let minAmountOut: bigint
  let etaSeconds: number
  let usdIn: number | undefined
  let usdOut: number | undefined
  let expiresAt: number | undefined
  let rawBridge: unknown

  try {
    if (provider === 'near') {
      const response = await getNearQuote(
        {
          dry: true,
          swapType: 'EXACT_INPUT',
          originAsset: NEAR_BCH_ASSET_ID,
          destinationAsset: stable.nearAssetId,
          amount: bridgeSats,
          recipient: req.addresses?.stableSide ?? PLACEHOLDER_ADDRESS[kind],
          refundTo: req.addresses?.bchPlain ?? PLACEHOLDER_ADDRESS.bch,
          slippageBps: req.slippageBps,
          deadline: new Date(now + NEAR_UTXO_DEADLINE_MS),
        },
        signal,
      )
      amountOut = BigInt(response.quote.amountOut)
      minAmountOut = BigInt(response.quote.minAmountOut)
      // NEAR's estimate starts once it takes the deposit, two Bitcoin Cash blocks in (~10 minutes each on average).
      etaSeconds = NEAR_BCH_CONFIRMATIONS * BCH_BLOCK_SECONDS + response.quote.timeEstimate
      usdIn = Number(response.quote.amountInUsd)
      usdOut = Number(response.quote.amountOutUsd)
      rawBridge = response
    } else {
      const quote = await getThorQuote(
        {
          fromAsset: THORCHAIN_BCH_ASSET,
          toAsset: stable.thorchainAsset as string,
          amount: bridgeSats,
          ...(req.addresses ? { destination: req.addresses.stableSide } : {}),
          toleranceBps: req.slippageBps,
        },
        signal,
      )
      const minimum = quote.recommended_min_amount_in ? BigInt(quote.recommended_min_amount_in) : 0n
      if (bridgeSats < minimum) {
        return {
          ok: false,
          provider,
          reason: 'below-minimum',
          message: 'Below THORChain’s minimum for this route',
          minimum: toPayingUnits(minimum, req, bridgeSats),
        }
      }
      amountOut = fromThorUnits(BigInt(quote.expected_amount_out), stable.decimals)
      minAmountOut = (amountOut * (BPS - BigInt(req.slippageBps))) / BPS
      etaSeconds = quote.total_swap_seconds ?? BCH_BLOCK_SECONDS
      expiresAt = quote.expiry * 1000
      rawBridge = quote
    }
  } catch (error) {
    // NEAR states its minimum in sats; the person pays in tokens when selling PUSD or MUSD.
    if (error instanceof BelowMinimumError) {
      return {
        ok: false,
        provider,
        reason: 'below-minimum',
        message: 'Below NEAR Intents’ minimum for this route',
        minimum: toPayingUnits(error.minimum, req, bridgeSats),
      }
    }
    throw error
  }

  // Selling PUSD or MUSD first: the sale may also slip, and the bridge is quoted for what it produced.
  if (leg) minAmountOut = (minAmountOut * (BPS - BigInt(req.slippageBps))) / BPS

  return {
    ok: true,
    route: {
      provider,
      pair: req.pair,
      amountIn: req.amount,
      amountOut,
      minAmountOut,
      bridgeSats,
      ...(leg ? { cauldron: leg } : {}),
      ...(usdIn === undefined ? {} : { usdIn }),
      ...(usdOut === undefined ? {} : { usdOut }),
      // One transaction (the sale pays the bridge) waits for no Cauldron leg of its own.
      etaSeconds: etaSeconds + (leg && !saleIsDeposit ? CAULDRON_LEG_SECONDS : 0),
      signatures: bchAsset === 'BCH' || saleIsDeposit ? 1 : 2,
      quotedAt: now,
      ...(expiresAt === undefined ? {} : { expiresAt }),
      raw: { bridge: rawBridge, ...(rawCauldron ? { cauldron: rawCauldron } : {}) },
    },
  }
}

/**
 * Tokens come in whole base units (0.01 PUSD), so a BCH-for-tokens trade nearly always leaves a few hundred sats
 * unspent; they return as change. Only a real shortfall (under 99% filled) counts as a partial fill.
 */
export function isPartialFill(fill: { filled: string; requested: string } | undefined): boolean {
  if (!fill) return false
  const requested = BigInt(fill.requested)
  return requested > 0n && BigInt(fill.filled) * 100n < requested * 99n
}

export function tooSmallForCauldron(provider: RouteVia): RouteOutcome {
  return {
    ok: false,
    provider,
    reason: 'below-minimum',
    message: 'Too small to cover the Bitcoin Cash network fees',
  }
}

/** A minimum in sats, restated in what the person pays (tokens, when selling PUSD or MUSD). */
function toPayingUnits(minimumSats: bigint, req: QuoteRequest<BridgePair>, bridgeSats: bigint): bigint {
  if (req.pair.bchAsset === 'BCH' || bridgeSats <= 0n) return minimumSats
  return (minimumSats * req.amount + bridgeSats - 1n) / bridgeSats
}

/** The name of a chain on this route whose THORChain trading is paused, if any. */
async function pausedThorChain(req: QuoteRequest<BridgePair>): Promise<string | undefined> {
  const halted = await getThorHaltedChains().catch(() => new Set<string>())
  const onRoute: ChainInfo[] = [CHAINS[req.pair.stable.chain], CHAINS.bch]
  return onRoute.find((c) => c.thorchainChain && halted.has(c.thorchainChain))?.name
}

/** Turns a provider's error into a reason the route list can show. */
export function classify(provider: RouteVia, error: unknown): RouteOutcome {
  if (error instanceof BelowMinimumError) {
    // The bridge's own sentence states its minimum in base units ("try at least 150000" is 0.15 USDC): the
    // screen words it from `minimum` instead.
    return {
      ok: false,
      provider,
      reason: 'below-minimum',
      message: 'Below NEAR Intents’ minimum for this route',
      minimum: error.minimum,
    }
  }
  if (isThorHaltError(error)) {
    return { ok: false, provider, reason: 'halted', message: 'THORChain has paused trading on this route' }
  }
  if (error instanceof ProviderError && /less than price limit/i.test(error.message)) {
    return {
      ok: false,
      provider,
      reason: 'no-liquidity',
      message: 'The price would move more than your slippage allows',
    }
  }
  if (error instanceof RouterError && /route|liquidity|fill/i.test(`${error.code} ${error.message}`)) {
    return {
      ok: false,
      provider,
      reason: 'no-liquidity',
      message: 'Not enough Cauldron liquidity for this amount',
    }
  }
  if (error instanceof DOMException && error.name === 'AbortError') throw error
  const message =
    error instanceof ProviderError || error instanceof Error ? error.message : 'Something went wrong'
  return { ok: false, provider, reason: 'error', message }
}

function toThorUnits(amount: bigint, decimals: number): bigint {
  return decimals >= THORCHAIN_DECIMALS
    ? amount / 10n ** BigInt(decimals - THORCHAIN_DECIMALS)
    : amount * 10n ** BigInt(THORCHAIN_DECIMALS - decimals)
}

function fromThorUnits(amount: bigint, decimals: number): bigint {
  return decimals >= THORCHAIN_DECIMALS
    ? amount * 10n ** BigInt(decimals - THORCHAIN_DECIMALS)
    : amount / 10n ** BigInt(THORCHAIN_DECIMALS - decimals)
}
