import type { DappConnectionManager } from '@wizardconnect/dapp'
import { type Address, type Hash, toHex } from 'viem'
import { normalizeBchAddress } from '@/lib/bch/address'
import {
  prepareBchBuy,
  prepareTokenBuy,
  prepareTokenSell,
  prepareTokenSwap,
  satsPaidTo,
} from '@/lib/bch/cauldron-trade'
import { broadcast, listUnspent } from '@/lib/bch/electrum'
import { signRouterBuild } from '@/lib/bch/sign'
import { planPayment, signPlanned } from '@/lib/bch/tx'
import type { WalletAddress, WalletUtxo } from '@/lib/bch/wallet'
import {
  BCH_ASSETS,
  type BchAssetId,
  NEAR_BCH_ASSET_ID,
  STABLES,
  THORCHAIN_BCH_ASSET,
} from '@/lib/constants/assets'
import { CHAINS } from '@/lib/constants/chains'
import { ARRIVAL_MIN_COIN_SATS, BCH_SEND_FEE_SATS } from '@/lib/constants/fees'
import { DEFAULT_SLIPPAGE_BPS, NEAR_DEADLINE_MS, NEAR_UTXO_DEADLINE_MS } from '@/lib/constants/limits'
import { approveIfNeeded, signUsdcTransferAuthorization, thorDeposit, transferErc20 } from '@/lib/evm/actions'
import { displayDecimals, formatAmount } from '@/lib/format'
import { getRouter, offeredBelowFloor, routerAsset } from '@/lib/providers/cauldron'
import { getNearQuote, getNearStatus, type NearQuoteResponse, submitNearDeposit } from '@/lib/providers/near'
import { getThorQuote, getThorStatus, THORCHAIN_DECIMALS, type ThorQuote } from '@/lib/providers/thorchain'
import { prepareArrival, registerArrival, tradesOnArrival } from './arrival-terms'
import { proceedsFromSell } from './cauldron-fees'
import { quoteDeadline } from './expiry'
import { advance, type SwapRecord } from './swap'
import { isLocal, type Pair, PROVIDERS, type RouteVia, type SwapAddresses } from './types'

/**
 * Runs a swap one step at a time. Each step takes the saved record, does one thing (a real quote, one wallet
 * approval, one status check), and returns the next record, which the caller saves. Because every step starts
 * from the record alone, a swap interrupted at any point resumes from the same place.
 *
 *   forward:  quoted → deposit-sent → bridging → bch-arrived → completed      (BCH itself skips bch-arrived)
 *   reverse:  quoted → (sold) → deposit-sent → bridging → completed            (PUSD or MUSD: sold first, saved)
 *   local:    quoted → completed                     (one Cauldron trade on Bitcoin Cash, no bridge)
 *   any:      … → refunded | failed;  quoted → expired (the quote ran out before anything was sent)
 *
 * Every Cauldron trade is built with a floor (the Router refuses to build below it) and every bridge quote taken
 * mid-swap is checked against what the person accepted. When prices have moved past it, nothing is signed: the step
 * throws a PriceMovedError, and the person can go ahead at the new price or wait.
 */

export interface BchSide {
  manager: DappConnectionManager
  /** The wallet's coins, re-read from Electrum. */
  coins: () => Promise<WalletUtxo[]>
  receive: WalletAddress
}

/** The Solana wallet: sends USDC/USDT and resolves to the signature (AppKit's provider, see evm-wallet.tsx). */
export interface SolanaSide {
  send: (transfer: { mint: string; to: string; amount: bigint; decimals: number }) => Promise<string>
}

/** The wallets a deposit may need: the Bitcoin Cash wallet (reverse) or the Solana wallet (forward from Solana). */
export interface DepositSides {
  bch?: BchSide | undefined
  solana?: SolanaSide | undefined
}

export type Log = (step: string, detail: string) => void

/** Which floor a price check guards: the Cauldron sale, the bridge quoted after it, or a Cauldron buy or swap. */
export type FloorStage = 'sale' | 'bridge' | 'cauldron'

/** Prices moved past what the person accepted. Nothing was signed; `floor` is the one to use if they go ahead. */
export class PriceMovedError extends Error {
  constructor(
    message: string,
    readonly stage: FloorStage,
    readonly floor: bigint,
  ) {
    super(message)
    this.name = 'PriceMovedError'
  }
}

export interface StepOptions {
  /** Saves the record between the two approvals of a sale, so a stop after the first resumes after it. */
  checkpoint?: (record: SwapRecord) => Promise<void>
  /** A lower floor the person accepted after a PriceMovedError, for the stage that raised it. */
  accept?: { stage: FloorStage; floor: bigint }
}

export { quoteDeadline }

/** How long to wait for a just-broadcast sale to show up before paying the bridge from it. */
const SEEN_TIMEOUT_MS = 30_000
const BPS = 10_000n

function stableOf(record: Pick<SwapRecord, 'stable'>) {
  const stable = STABLES.find((s) => s.chain === record.stable?.chain && s.symbol === record.stable?.symbol)
  if (!stable) throw new Error('This swap has no stablecoin side')
  return stable
}

/** The person's address on the stablecoin's chain (bridged swaps only). */
function stableSideOf(record: Pick<SwapRecord, 'addresses'>): Address {
  const address = record.addresses.stableSide
  if (!address) throw new Error('This swap has no address on the stablecoin chain')
  return address as Address
}

function evmChainId(record: Pick<SwapRecord, 'stable'>) {
  const chain = CHAINS[stableOf(record).chain]
  if (chain.kind !== 'evm' || !('evmChainId' in chain))
    throw new Error(`${chain.name} deposits are not wired yet`)
  return chain.evmChainId
}

function toThorUnits(amount: bigint, decimals: number) {
  return decimals >= THORCHAIN_DECIMALS
    ? amount / 10n ** BigInt(decimals - THORCHAIN_DECIMALS)
    : amount * 10n ** BigInt(THORCHAIN_DECIMALS - decimals)
}

function fromThorUnits(amount: bigint, decimals: number) {
  return decimals >= THORCHAIN_DECIMALS
    ? amount * 10n ** BigInt(decimals - THORCHAIN_DECIMALS)
    : amount / 10n ** BigInt(THORCHAIN_DECIMALS - decimals)
}

/** `amount` less the person's slippage. */
function lessSlippage(amount: bigint, record: Pick<SwapRecord, 'slippageBps'>) {
  return (amount * (BPS - BigInt(record.slippageBps ?? DEFAULT_SLIPPAGE_BPS))) / BPS
}

function bchText(amount: bigint, asset: BchAssetId) {
  return `${formatAmount(amount, BCH_ASSETS[asset].decimals, displayDecimals(asset))} ${asset}`
}

function stableText(amount: bigint, record: Pick<SwapRecord, 'stable'>) {
  const stable = stableOf(record)
  return `${formatAmount(amount, stable.decimals, displayDecimals(stable.symbol))} ${stable.symbol}`
}

/** Builds a Cauldron trade; when the Router refuses it for falling under `min_output`, says so as a PriceMovedError. */
async function withFloor<T>(
  build: () => Promise<T>,
  moved: (offered: bigint) => PriceMovedError,
): Promise<T> {
  try {
    return await build()
  } catch (error) {
    const offered = offeredBelowFloor(error)
    if (offered !== undefined) throw moved(offered)
    throw error
  }
}

export interface StartParams {
  provider: RouteVia
  pair: Pair
  amount: bigint
  slippageBps: number
  addresses: SwapAddresses
  /** Reverse via NEAR with a token: sale and deposit as one transaction (T5), or as two. */
  oneApproval: boolean
  /** Forward via NEAR with Base USDC: sign instead of paying gas (T6). */
  gasless?: boolean
  /** The numbers the review showed, kept on the record for the tracker and Activity. */
  quoted?: SwapRecord['quoted']
  /**
   * Into PUSD or MUSD in one approval: the review's "at least" and the least BCH the bridge promised, which become
   * the swap contract's floor. Without it the bridge pays the wallet and the trade is a second approval.
   */
  arrival?: { minTokens: bigint; minBridgeSats: bigint }
}

/** How long a gasless authorisation stays valid (the relayer accepts up to an hour). */
const GASLESS_VALIDITY_SECONDS = 1800

/**
 * A real quote: NEAR issues a deposit address; THORChain names its vault, router and memo. Moves nothing. A swap
 * that starts with a Cauldron trade (staying on Bitcoin Cash, or selling PUSD or MUSD) needs nothing from anyone
 * yet: Cauldron prices it again when the trade is built, and a sale's bridge is quoted for what the sale produced.
 */
export async function startSwap(params: StartParams, log: Log): Promise<SwapRecord> {
  const { provider, pair, amount, slippageBps, addresses } = params
  const now = Date.now()
  const common = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    provider,
    amountIn: amount.toString(),
    approvals: 0,
    ...(params.quoted ? { quoted: params.quoted } : {}),
    slippageBps,
    addresses,
    status: 'quoted' as const,
    events: [],
  }
  if (isLocal(pair)) {
    log('quote', `Cauldron: ${amount} ${pair.from} → ${pair.to}, priced again when the trade is built`)
    return advance(
      { ...common, direction: 'local', bchFrom: pair.from, bchAsset: pair.to },
      'quoted',
      'Cauldron trade ready to build',
    )
  }
  if (provider === 'cauldron') throw new Error('A bridged swap needs NEAR Intents or THORChain')
  const base: SwapRecord = {
    ...common,
    direction: pair.direction,
    stable: { chain: pair.stable.chain, symbol: pair.stable.symbol },
    bchAsset: pair.bchAsset,
    ...(params.gasless ? { gasless: true } : {}),
  }
  const stableSide = stableSideOf(base)

  if (pair.direction === 'out') {
    if (pair.bchAsset === 'BCH') {
      const priced = await priceBridgeOut(base, amount, log)
      return advance(base, 'quoted', `${PROVIDERS[provider].name} quote with deposit address`, priced.patch)
    }
    // PUSD or MUSD: the Cauldron sale comes first, and the bridge receives what it leaves after its fees.
    const sale = await getRouter().quote({
      sell: routerAsset(pair.bchAsset),
      buy: 'bch',
      amount,
      side: 'sell',
    })
    const net = proceedsFromSell(BigInt(sale.output_amount ?? '0'), sale.pools)
    log('cauldron', `sale ≈ ${sale.output_amount} sats over ${sale.pools} pools; ${net} sats after its fees`)
    if (!(params.oneApproval && provider === 'near')) {
      return advance(base, 'quoted', `Sale of ${pair.bchAsset} on Cauldron ready to build`, {
        bchSats: (net - BCH_SEND_FEE_SATS).toString(),
      })
    }
    // T5: one approval. NEAR takes a band of deposit amounts (FLEX_INPUT), and the sale pays its address directly.
    const response = await getNearQuote({
      dry: false,
      swapType: 'FLEX_INPUT',
      originAsset: NEAR_BCH_ASSET_ID,
      destinationAsset: pair.stable.nearAssetId,
      amount: net,
      recipient: stableSide,
      refundTo: addresses.bchPlain,
      slippageBps,
      deadline: new Date(now + NEAR_UTXO_DEADLINE_MS),
    })
    const raw = response.quote.depositAddress
    if (!raw) throw new Error('NEAR Intents returned no deposit address')
    // NEAR pays at least minAmountOut for any deposit from minAmountIn up; it must still keep the review's promise.
    const promised = params.quoted ? BigInt(params.quoted.minAmountOut) : undefined
    const minOut = BigInt(response.quote.minAmountOut)
    if (promised !== undefined && minOut < promised) {
      throw new Error(
        `Prices moved: NEAR Intents would now pay at least ${stableText(minOut, base)}, under the ${stableText(promised, base)} shown. Nothing was sent; review the new quote.`,
      )
    }
    log(
      'quote',
      `NEAR deposit ${raw}; takes ${response.quote.minAmountIn}–${response.quote.amountIn}+ sats; pays at least ${minOut}`,
    )
    return advance(base, 'quoted', 'NEAR Intents quote with deposit address', {
      depositAddress: normalizeBchAddress(raw),
      bridgeQuote: response,
      bchSats: response.quote.amountIn,
    })
  }

  // Into PUSD or MUSD: the bridge pays this swap's own contract, which trades the BCH without the wallet. Its public
  // terms go to Hashi's server first; if the server cannot keep them, the bridge pays the wallet as before.
  let arrival =
    params.arrival && pair.bchAsset !== 'BCH'
      ? prepareArrival({
          bchAsset: pair.bchAsset,
          ownerAddress: addresses.bchToken,
          minTokens: params.arrival.minTokens,
          minBridgeSats: params.arrival.minBridgeSats,
          now,
        })
      : undefined
  if (arrival) {
    try {
      await registerArrival(arrival)
    } catch (error) {
      log(
        'quote',
        `swap contract not kept by the server (${error instanceof Error ? error.message : String(error)}); paying the wallet`,
      )
      arrival = undefined
    }
  }
  const bchRecipient = arrival?.address ?? addresses.bchPlain
  if (arrival)
    log(
      'quote',
      `swap contract ${arrival.address}, floor ${arrival.terms.rateNum}/${arrival.terms.rateDen} per sat`,
    )

  if (provider === 'near') {
    const response = await getNearQuote({
      dry: false,
      swapType: 'EXACT_INPUT',
      originAsset: pair.stable.nearAssetId,
      destinationAsset: NEAR_BCH_ASSET_ID,
      amount,
      recipient: bchRecipient,
      refundTo: stableSide,
      slippageBps,
      deadline: new Date(now + NEAR_DEADLINE_MS),
    })
    const depositAddress = response.quote.depositAddress
    if (!depositAddress) throw new Error('NEAR Intents returned no deposit address')
    log(
      'quote',
      `NEAR deposit ${depositAddress}; in ${response.quote.amountIn}; out ${response.quote.amountOut} (min ${response.quote.minAmountOut}); deadline ${response.quote.deadline}`,
    )
    return advance(base, 'quoted', 'NEAR Intents quote with deposit address', {
      depositAddress,
      bridgeQuote: response,
      ...(arrival ? { arrival } : {}),
    })
  }

  const thorAsset = pair.stable.thorchainAsset
  if (!thorAsset) throw new Error('THORChain has no pool for this stablecoin')
  const quote = await getThorQuote({
    fromAsset: thorAsset,
    toAsset: THORCHAIN_BCH_ASSET,
    amount: toThorUnits(amount, pair.stable.decimals),
    destination: bchRecipient,
    // From an EVM chain the refund address fits the memo, so a refund goes where the review says.
    refundAddress: stableSide,
    toleranceBps: slippageBps,
  })
  if (!quote.inbound_address || !quote.memo) throw new Error('THORChain returned no vault or memo')
  log(
    'quote',
    `THORChain vault ${quote.inbound_address}; memo ${quote.memo}; expected ${quote.expected_amount_out}`,
  )
  return advance(base, 'quoted', 'THORChain quote', {
    depositAddress: quote.inbound_address,
    memo: quote.memo,
    ...(quote.router ? { router: quote.router } : {}),
    bridgeQuote: quote,
    ...(arrival ? { arrival } : {}),
  })
}

/**
 * A bridge quote for sending `sats` of BCH out to the stablecoin: NEAR's deposit address, or THORChain's vault and
 * memo. `minOut`: the least it pays, in the stablecoin's base units.
 */
async function priceBridgeOut(record: SwapRecord, sats: bigint, log: Log) {
  const stable = stableOf(record)
  const stableSide = stableSideOf(record)
  const slippageBps = record.slippageBps ?? DEFAULT_SLIPPAGE_BPS
  if (record.provider === 'near') {
    const response = await getNearQuote({
      dry: false,
      swapType: 'EXACT_INPUT',
      originAsset: NEAR_BCH_ASSET_ID,
      destinationAsset: stable.nearAssetId,
      amount: sats,
      recipient: stableSide,
      refundTo: record.addresses.bchPlain,
      slippageBps,
      deadline: new Date(Date.now() + NEAR_UTXO_DEADLINE_MS),
    })
    const raw = response.quote.depositAddress
    if (!raw) throw new Error('NEAR Intents returned no deposit address')
    const depositAddress = normalizeBchAddress(raw)
    log(
      'quote',
      `NEAR deposit ${depositAddress}; in ${response.quote.amountIn}; out ${response.quote.amountOut} (min ${response.quote.minAmountOut}); deadline ${response.quote.deadline}`,
    )
    return {
      minOut: BigInt(response.quote.minAmountOut),
      patch: { depositAddress, bridgeQuote: response, bchSats: response.quote.amountIn },
    }
  }
  const thorAsset = stable.thorchainAsset
  if (!thorAsset) throw new Error('THORChain has no pool for this stablecoin')
  // No refund address: it does not fit a Bitcoin Cash memo, so THORChain refunds to the deposit's first input,
  // which sendToBridge makes the person's own receive address.
  const quote = await getThorQuote({
    fromAsset: THORCHAIN_BCH_ASSET,
    toAsset: thorAsset,
    amount: sats,
    destination: stableSide,
    toleranceBps: slippageBps,
  })
  if (!quote.inbound_address || !quote.memo) throw new Error('THORChain returned no vault or memo')
  const minimum = quote.recommended_min_amount_in ? BigInt(quote.recommended_min_amount_in) : 0n
  if (sats < minimum) throw new Error(`THORChain needs at least ${bchText(minimum, 'BCH')} for this route`)
  log(
    'quote',
    `THORChain vault ${quote.inbound_address}; memo ${quote.memo}; expected ${quote.expected_amount_out}`,
  )
  return {
    minOut: lessSlippage(fromThorUnits(BigInt(quote.expected_amount_out), stable.decimals), record),
    patch: {
      depositAddress: normalizeBchAddress(quote.inbound_address),
      memo: quote.memo,
      ...(quote.router ? { router: quote.router } : {}),
      bridgeQuote: quote,
      bchSats: sats.toString(),
    },
  }
}

/**
 * A swap still waiting for its first approval when its quote runs out ends as expired: nothing was sent. NEAR is
 * asked first, in case a deposit went out but the tab closed before it was saved.
 */
export async function expireIfStale(record: SwapRecord, now: number, log: Log): Promise<SwapRecord> {
  const deadline = quoteDeadline(record)
  if (deadline === undefined || now < deadline) return record
  if (record.provider === 'near' && record.depositAddress) {
    const status = await getNearStatus(record.depositAddress)
    // Anything but "waiting for a deposit", a status Hashi does not know included, means money may have moved.
    if (status.status !== 'PENDING_DEPOSIT') {
      log('bridge', `NEAR ${status.statusText} after the deadline: a deposit was made`)
      return advance(record, 'deposit-sent', 'NEAR Intents found a deposit')
    }
  }
  log('expired', `the quote ran out at ${new Date(deadline).toISOString()}`)
  return advance(record, 'expired', 'The quote ran out before anything was sent')
}

/** The person's deposit: one or two wallet approvals, depending on the route (the trade itself, on Bitcoin Cash). */
export async function sendDeposit(
  record: SwapRecord,
  sides: DepositSides,
  log: Log,
  options: StepOptions = {},
): Promise<SwapRecord> {
  // Never pay into a quote that has run out: a NEAR address past its deadline, or a rotated THORChain vault.
  const deadline = quoteDeadline(record)
  if (deadline !== undefined && Date.now() >= deadline) return expireIfStale(record, Date.now(), log)

  const { bch } = sides
  if (record.direction === 'local') {
    if (!bch) throw new Error('Connect a Bitcoin Cash wallet first')
    return tradeOnCauldron(record, bch, log, options)
  }
  const amount = BigInt(record.amountIn)

  if (record.direction === 'in') {
    const depositAddress = record.depositAddress
    if (!depositAddress) throw new Error('No deposit address on this swap')
    const stable = stableOf(record)
    if (CHAINS[stable.chain].kind === 'solana') {
      // Solana: NEAR Intents only, one approval in the Solana wallet.
      if (!sides.solana) throw new Error('Connect a Solana wallet first')
      log('approve', `transfer ${amount} ${stable.symbol} to ${depositAddress} on Solana`)
      const signature = await sides.solana.send({
        mint: stable.address,
        to: depositAddress,
        amount,
        decimals: stable.decimals,
      })
      log('sent', signature)
      void submitNearDeposit(signature, depositAddress).catch(() => {})
      return advance(record, 'deposit-sent', 'Deposit sent to NEAR Intents', {
        depositTx: signature,
        approvals: record.approvals + 1,
      })
    }
    const chainId = evmChainId(record)
    if (record.provider === 'near') {
      const hash = record.gasless
        ? await relayDeposit(record, chainId, stable.address as Address, log)
        : await (async () => {
            log(
              'approve',
              `transfer ${amount} ${stable.symbol} to ${depositAddress} on ${CHAINS[stable.chain].name}`,
            )
            return transferErc20({
              chainId,
              token: stable.address as Address,
              to: depositAddress as Address,
              amount,
            })
          })()
      log('sent', hash)
      void submitNearDeposit(hash, depositAddress).catch(() => {})
      return advance(record, 'deposit-sent', 'Deposit sent to NEAR Intents', {
        depositTx: hash,
        approvals: record.approvals + 1,
      })
    }
    const quote = record.bridgeQuote as ThorQuote
    if (!record.router || !record.memo) throw new Error('THORChain quote has no router or memo')
    log('approve', `allow THORChain's router to move ${amount} ${stable.symbol}`)
    const approval = await approveIfNeeded({
      chainId,
      token: stable.address as Address,
      owner: stableSideOf(record),
      spender: record.router as Address,
      amount,
    })
    if (approval) log('approved', approval)
    log('approve', `depositWithExpiry ${amount} to vault ${depositAddress}`)
    const hash = await thorDeposit({
      chainId,
      router: record.router as Address,
      vault: depositAddress as Address,
      token: stable.address as Address,
      amount,
      memo: record.memo,
      expiry: BigInt(quote.expiry),
    })
    log('sent', hash)
    return advance(record, 'deposit-sent', 'Deposit sent to THORChain', {
      depositTx: hash,
      approvals: record.approvals + (approval ? 2 : 1),
    })
  }

  // Reverse: everything is signed by the Bitcoin Cash wallet.
  if (!bch) throw new Error('Connect a Bitcoin Cash wallet first')
  const asset = record.bchAsset
  const near = record.provider === 'near' ? (record.bridgeQuote as NearQuoteResponse | undefined) : undefined

  if (asset !== 'BCH' && near?.quoteRequest.swapType === 'FLEX_INPUT') {
    // T5: one approval. The Cauldron sale pays its proceeds straight to NEAR's deposit address.
    const depositAddress = record.depositAddress as string
    const trade = await prepareTokenSell({
      asset,
      amount,
      coins: await bch.coins(),
      receive: bch.receive,
      proceedsTo: depositAddress,
    })
    const paid = satsPaidTo(trade.build, depositAddress)
    const minimum = BigInt(near.quote.minAmountIn)
    log('build', `sale pays ${paid} sats to NEAR (needs ≥ ${minimum}); ${trade.build.route.pools} pools`)
    if (paid < minimum)
      throw new Error('Prices moved: the sale would pay NEAR less than its minimum. Ask for a new quote.')
    log('approve', `sell ${amount} ${asset} and pay NEAR in one transaction`)
    const signed = await signRouterBuild(
      bch.manager,
      trade.build,
      trade.owners,
      `Sell ${asset} and send to NEAR Intents`,
    )
    const txid = await broadcast(signed)
    log('sent', txid)
    void submitNearDeposit(txid, depositAddress).catch(() => {})
    return advance(record, 'deposit-sent', 'Sale and deposit in one transaction', {
      bchTxid: txid,
      bchSats: paid.toString(),
      approvals: record.approvals + 1,
    })
  }

  if (asset !== 'BCH') return sellThenBridge(record, bch, log, options)
  return sendToBridge(record, bch, await bch.coins(), log)
}

/**
 * Selling PUSD or MUSD for a stablecoin, in two approvals. First the Cauldron sale, held to the person's slippage
 * and saved the moment it is out; then the BCH it produced, sent to a bridge quoted for exactly that amount, after
 * checking the bridge still pays at least what the review promised.
 */
async function sellThenBridge(
  record: SwapRecord,
  bch: BchSide,
  log: Log,
  options: StepOptions,
): Promise<SwapRecord> {
  const asset = record.bchAsset as 'PUSD' | 'MUSD'
  const provider = PROVIDERS[record.provider].name
  let current = record

  if (!current.cauldronTxid) {
    const amount = BigInt(current.amountIn)
    const expected = BigInt(current.bchSats ?? '0') + BCH_SEND_FEE_SATS
    const floor = options.accept?.stage === 'sale' ? options.accept.floor : lessSlippage(expected, current)
    const trade = await withFloor(
      async () =>
        prepareTokenSell({
          asset,
          amount,
          coins: await bch.coins(),
          receive: bch.receive,
          proceedsTo: bch.receive.plain,
          minOutput: floor,
        }),
      (offered) =>
        new PriceMovedError(
          `Prices moved: Cauldron now gives about ${bchText(offered, 'BCH')} for your ${asset}, under the ${bchText(floor, 'BCH')} this swap allows. Nothing was sold.`,
          'sale',
          lessSlippage(offered, current),
        ),
    )
    const proceeds = satsPaidTo(trade.build, bch.receive.plain)
    log('approve', `sell ${amount} ${asset} (${trade.build.route.pools} pools) for ${proceeds} sats`)
    const signed = await signRouterBuild(bch.manager, trade.build, trade.owners, `Sell ${asset} on Cauldron`)
    const saleTxid = await broadcast(signed)
    log('sold', saleTxid)
    current = advance(current, 'quoted', `Sold ${asset} on Cauldron`, {
      cauldronTxid: saleTxid,
      bchSats: (proceeds - BCH_SEND_FEE_SATS).toString(),
      approvals: current.approvals + 1,
    })
    await options.checkpoint?.(current)
  }

  const coins = await waitForCoin(bch, current.cauldronTxid as string)
  const priced = await priceBridgeOut(current, BigInt(current.bchSats ?? '0'), log)
  const promised = current.quoted ? BigInt(current.quoted.minAmountOut) : undefined
  const floor = options.accept?.stage === 'bridge' ? options.accept.floor : promised
  if (floor !== undefined && priced.minOut < floor) {
    throw new PriceMovedError(
      `Prices moved: ${provider} would now pay at least ${stableText(priced.minOut, current)}, under the ${stableText(floor, current)} you accepted. Your ${asset} was sold; the BCH is in your wallet.`,
      'bridge',
      lessSlippage(priced.minOut, current),
    )
  }
  return sendToBridge({ ...current, ...priced.patch }, bch, coins, log)
}

/** One BCH payment to the bridge (with THORChain's memo), from the person's receive address first. */
async function sendToBridge(record: SwapRecord, bch: BchSide, coins: WalletUtxo[], log: Log) {
  const depositAddress = record.depositAddress
  if (!depositAddress) throw new Error('No deposit address on this swap')
  const value = BigInt(record.bchSats ?? record.amountIn)
  const memo = record.provider === 'thorchain' ? record.memo : undefined
  const plan = planPayment({
    coins,
    payments: [{ address: depositAddress, value }],
    ...(memo ? { memo } : {}),
    // THORChain refunds to the address of input 0: make it the receive address the review names.
    first: record.addresses.bchPlain,
  })
  log(
    'approve',
    `send ${value} sats to ${depositAddress}${memo ? ` with memo ${memo}` : ''} (fee ${plan.feeSats})`,
  )
  const signed = await signPlanned(bch.manager, plan, `Send BCH to ${PROVIDERS[record.provider].name}`)
  const txid = await broadcast(signed)
  log('sent', txid)
  if (record.provider === 'near') void submitNearDeposit(txid, depositAddress).catch(() => {})
  return advance(record, 'deposit-sent', 'BCH deposit sent', {
    bchTxid: txid,
    approvals: record.approvals + 1,
  })
}

/** T6: the person signs an EIP-3009 authorisation; Hashi's relayer submits it and pays the gas. */
async function relayDeposit(record: SwapRecord, chainId: number, usdc: Address, log: Log): Promise<Hash> {
  const from = stableSideOf(record)
  const to = record.depositAddress as Address
  const value = BigInt(record.amountIn)
  const now = Math.floor(Date.now() / 1000)
  const validAfter = BigInt(now - 60)
  const validBefore = BigInt(now + GASLESS_VALIDITY_SECONDS)
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(32)))
  log('approve', `sign a gasless authorisation for ${value} USDC to ${to}`)
  const auth = await signUsdcTransferAuthorization({
    chainId,
    usdc,
    from,
    to,
    value,
    validAfter,
    validBefore,
    nonce,
  })
  const response = await fetch('/api/relay', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chainId,
      from,
      to,
      value: value.toString(),
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce,
      v: auth.v,
      r: auth.r,
      s: auth.s,
    }),
  })
  const body = (await response.json().catch(() => ({}))) as { hash?: Hash; error?: string }
  if (!response.ok || !body.hash) throw new Error(body.error ?? 'The relayer refused the deposit')
  log('relayed', body.hash)
  return body.hash
}

async function waitForCoin(bch: BchSide, txid: string): Promise<WalletUtxo[]> {
  const started = Date.now()
  while (Date.now() - started < SEEN_TIMEOUT_MS) {
    const coins = await bch.coins()
    if (coins.some((c) => c.txid === txid)) return coins
    await new Promise((r) => setTimeout(r, 2_000))
  }
  throw new Error('The sale has not appeared yet; resume this swap in a moment to send the BCH on')
}

/** What the bridge said at a status check, for the tracker's live progress (features/activity/progress.ts). */
export interface BridgeReading {
  at: number
  near?: { status: string; updatedAt: number }
  thor?: {
    observed: boolean
    confirmed: boolean
    confirmSecondsLeft?: number
    swapped: boolean
    outboundSecondsLeft?: number
    sent: boolean
  }
}

/** One status check with the bridge. Returns the same record when nothing changed. */
export async function checkBridge(
  record: SwapRecord,
  log: Log,
  onReading?: (reading: BridgeReading) => void,
): Promise<SwapRecord> {
  if (record.provider === 'cauldron') return record
  const forward = record.direction === 'in'
  // A swap contract's own coins are the surest sign the BCH arrived: the chain, not the bridge's status page. Only
  // an amount near what the bridge promised counts (half of it), so dust someone sends there is not taken for it.
  if (record.arrival && tradesOnArrival(record)) {
    const landed = (await listUnspent(record.arrival.address)).filter(
      (c) => !c.token && c.value >= ARRIVAL_MIN_COIN_SATS,
    )
    const [first] = landed
    const sats = landed.reduce((sum, c) => sum + c.value, 0n)
    if (first && sats * 2n >= BigInt(record.arrival.terms.rateDen)) {
      log('bridge', `${sats} sats at the swap contract (${first.txid})`)
      return advance(record, 'bch-arrived', 'BCH arrived at the swap contract', {
        bchTxid: first.txid,
        bchSats: sats.toString(),
      })
    }
  }
  if (record.provider === 'near') {
    if (!record.depositAddress) return record
    const status = await getNearStatus(record.depositAddress)
    const details = status.swapDetails
    const updatedAt = Date.parse(status.updatedAt)
    onReading?.({
      at: Date.now(),
      near: { status: status.statusText, updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now() },
    })
    switch (status.status) {
      case 'SUCCESS': {
        const out = details.destinationChainTxHashes[0]?.hash
        log('bridge', `NEAR SUCCESS; payout ${out ?? '?'} (${details.amountOut ?? '?'})`)
        if (forward) {
          return advance(record, record.bchAsset === 'BCH' ? 'completed' : 'bch-arrived', 'BCH delivered', {
            ...(out ? { bchTxid: out } : {}),
            ...(details.amountOut ? { bchSats: details.amountOut } : {}),
            ...(details.amountOut && record.bchAsset === 'BCH' ? { receivedAmount: details.amountOut } : {}),
          })
        }
        return advance(record, 'completed', 'Stablecoin delivered', {
          ...(out ? { payoutTx: out } : {}),
          ...(details.amountOut ? { receivedAmount: details.amountOut } : {}),
        })
      }
      case 'REFUNDED':
        log('bridge', `NEAR REFUNDED: ${details.refundReason ?? 'no reason given'}`)
        return advance(record, 'refunded', details.refundReason ?? 'Refunded by NEAR Intents')
      case 'FAILED':
        log('bridge', 'NEAR FAILED')
        return advance(record, 'failed', 'NEAR Intents reported a failure')
      case 'PROCESSING':
        return record.status === 'bridging' ? record : advance(record, 'bridging', 'NEAR Intents is swapping')
      case 'INCOMPLETE_DEPOSIT':
        log('bridge', `NEAR INCOMPLETE_DEPOSIT (deposited ${details.depositedAmount ?? '?'})`)
        return record
      case 'UNKNOWN':
        // A status NEAR added after Hashi was written: keep waiting for one Hashi knows, and say which it was.
        log('bridge', `NEAR reports "${status.statusText}", a status Hashi does not know yet; still waiting`)
        return record
      default:
        return record
    }
  }

  const inbound = forward ? record.depositTx : record.bchTxid
  if (!inbound) return record
  const status = await getThorStatus(inbound as Hash)
  const stages = status.stages
  const counting = stages.inbound_confirmation_counted
  const delay = stages.outbound_delay
  onReading?.({
    at: Date.now(),
    thor: {
      observed: Boolean(stages.inbound_observed?.completed),
      // Small deposits skip the confirmation stage: then being observed is enough.
      confirmed: counting ? Boolean(counting.completed) : Boolean(stages.inbound_observed?.completed),
      ...(counting && !counting.completed && counting.remaining_confirmation_seconds !== undefined
        ? { confirmSecondsLeft: counting.remaining_confirmation_seconds }
        : {}),
      swapped: Boolean(stages.swap_finalised?.completed),
      ...(delay && !delay.completed && delay.remaining_delay_seconds !== undefined
        ? { outboundSecondsLeft: delay.remaining_delay_seconds }
        : {}),
      sent: Boolean(stages.outbound_signed?.completed),
    },
  })
  const out = status.out_txs?.[0]
  if (out?.id) {
    const refund = status.planned_out_txs?.some((p) => p.refund)
    if (refund) return advance(record, 'refunded', 'Refunded by THORChain', { payoutTx: out.id })
    log('bridge', `THORChain out ${out.id}`)
    if (forward) {
      return advance(record, record.bchAsset === 'BCH' ? 'completed' : 'bch-arrived', 'BCH delivered', {
        bchTxid: out.id.toLowerCase(),
      })
    }
    return advance(record, 'completed', 'Stablecoin delivered', { payoutTx: out.id })
  }
  if (status.stages.inbound_observed?.completed && record.status !== 'bridging') {
    return advance(record, 'bridging', 'THORChain saw the deposit')
  }
  return record
}

/**
 * Forward with PUSD or MUSD: swap the BCH that just arrived on Cauldron, then the swap is done. Built with the
 * review's "at least" as its floor, so the whole swap keeps that promise.
 */
export async function finishOnCauldron(
  record: SwapRecord,
  bch: BchSide,
  log: Log,
  options: StepOptions = {},
): Promise<SwapRecord> {
  if (record.bchAsset === 'BCH') return advance(record, 'completed', 'BCH delivered')
  const asset = record.bchAsset
  const txid = record.bchTxid?.toLowerCase()
  const arrived = (await bch.coins()).filter(
    (c) => !c.token && c.txid.toLowerCase() === txid && c.address.plain === record.addresses.bchPlain,
  )
  const holder = arrived[0]?.address
  if (!holder) throw new Error('The bridged BCH is not visible in the wallet yet')
  const total = arrived.reduce((sum, c) => sum + c.value, 0n)
  const floor =
    options.accept?.stage === 'cauldron'
      ? options.accept.floor
      : record.quoted
        ? BigInt(record.quoted.minAmountOut)
        : undefined
  const trade = await withFloor(
    () =>
      prepareTokenBuy({
        asset,
        coins: arrived,
        receive: holder,
        ...(floor === undefined ? {} : { minOutput: floor }),
      }),
    (offered) =>
      new PriceMovedError(
        `Prices moved: Cauldron now gives about ${bchText(offered, asset)} for this BCH, under the ${bchText(floor ?? 0n, asset)} you accepted. The BCH stays in your wallet until you choose.`,
        'cauldron',
        lessSlippage(offered, record),
      ),
  )
  log(
    'build',
    `buy ${asset} with ${total} sats: ${trade.build.route.pools} pools, expect ${trade.build.expected_output}`,
  )
  log('approve', `swap the arrived BCH for ${asset}`)
  const signed = await signRouterBuild(bch.manager, trade.build, trade.owners, `Swap your BCH for ${asset}`)
  const cauldronTxid = await broadcast(signed)
  log('sent', cauldronTxid)
  return advance(
    record,
    'completed',
    `Swapped into ${asset}${options.accept ? ' at the new price you accepted' : ''}`,
    {
      cauldronTxid,
      receivedAmount: trade.build.expected_output,
      approvals: record.approvals + 1,
    },
  )
}

/**
 * A swap that stays on Bitcoin Cash: one Cauldron trade from the person's own coins, signed once in the Bitcoin
 * Cash wallet. It settles in that one transaction, at the built price or not at all, so it is done once broadcast.
 */
async function tradeOnCauldron(
  record: SwapRecord,
  bch: BchSide,
  log: Log,
  options: StepOptions,
): Promise<SwapRecord> {
  const from = record.bchFrom
  const to = record.bchAsset
  if (!from || from === to) throw new Error('This swap has nothing to trade')
  const amount = BigInt(record.amountIn)
  const coins = await bch.coins()
  const minOutput =
    options.accept?.stage === 'cauldron'
      ? options.accept.floor
      : record.quoted
        ? BigInt(record.quoted.minAmountOut)
        : undefined
  const floor = minOutput === undefined ? {} : { minOutput }
  const trade = await withFloor(
    () =>
      from === 'BCH'
        ? prepareBchBuy({
            asset: to as 'PUSD' | 'MUSD',
            amountSats: amount,
            coins,
            receive: bch.receive,
            ...floor,
          })
        : to === 'BCH'
          ? prepareTokenSell({
              asset: from,
              amount,
              coins,
              receive: bch.receive,
              proceedsTo: bch.receive.plain,
              ...floor,
            })
          : prepareTokenSwap({ from, to, amount, coins, receive: bch.receive, ...floor }),
    (offered) =>
      new PriceMovedError(
        `Prices moved: Cauldron now gives about ${bchText(offered, to)}, under the ${bchText(minOutput ?? 0n, to)} you accepted. Nothing has left your wallet.`,
        'cauldron',
        lessSlippage(offered, record),
      ),
  )
  log(
    'build',
    `${amount} ${from} → ${to}: ${trade.build.route.pools} pools, expect ${trade.build.expected_output}, miner fee ${trade.build.miner_fee_sats} sats`,
  )
  log('approve', `swap ${from} for ${to} on Cauldron`)
  const signed = await signRouterBuild(
    bch.manager,
    trade.build,
    trade.owners,
    `Swap ${from} for ${to} on Cauldron`,
  )
  const cauldronTxid = await broadcast(signed)
  log('sent', cauldronTxid)
  // Selling for BCH: what arrives is the proceeds paid to the wallet; buying a token: the tokens the build sends.
  const received =
    to === 'BCH' ? satsPaidTo(trade.build, bch.receive.plain) : BigInt(trade.build.expected_output)
  return advance(
    record,
    'completed',
    `Swapped ${from} into ${to} on Cauldron${options.accept ? ' at the new price you accepted' : ''}`,
    {
      cauldronTxid,
      receivedAmount: received.toString(),
      approvals: record.approvals + 1,
    },
  )
}

/** What the person (or the poller) does next. */
export function nextStep(record: SwapRecord): 'deposit' | 'wait' | 'finish' | 'done' {
  switch (record.status) {
    case 'quoted':
      return 'deposit'
    case 'deposit-sent':
    case 'bridging':
      return 'wait'
    case 'bch-arrived':
      return 'finish'
    default:
      return 'done'
  }
}
