import {
  binToHex,
  decodeTransaction,
  encodeTransaction,
  hash256,
  hexToBin,
  type Output,
  type TransactionCommon,
} from '@bitauth/libauth'
import type { RouterBuild } from '@/lib/providers/cauldron'
import {
  type ArrivalContract,
  type ArrivalTerms,
  arrivalFloor,
  placeholderUnlock,
  unlockReclaim,
  unlockRelease,
  unlockSwap,
} from './contract'

/**
 * The swap-on-arrival contract's transactions, built and checked without the network: the Cauldron trade (from a
 * Router build funded by the contract's coin) and the two ways the BCH goes back to the person. Every one is run
 * through the Bitcoin Cash VM (vm.ts) before anything is broadcast.
 */

/** BCHN's minimum relay fee: 1 sat per byte. */
const FEE_RATE = 1n
/** A few sats over the minimum, so rounding never leaves a transaction a hair under it. */
const FEE_MARGIN_SATS = 5n
/** Smallest output BCHN relays (a P2PKH output's dust limit). */
export const DUST_SATS = 546n
/** The contract's cap on what a refund may leave for the miner (contracts/swap-on-arrival.cash). */
export const RETURN_FEE_CAP_SATS = 3000n
/** A refund spends after its lock time; any sequence below the maximum lets the lock time count. */
const RECLAIM_SEQUENCE = 0xfffffffe
const FINAL_SEQUENCE = 0xffffffff

export interface ArrivalCoin {
  txid: string
  vout: number
  value: bigint
}

export interface FinishedTransaction {
  transaction: TransactionCommon
  sourceOutputs: Output[]
  hex: string
  txid: string
  size: number
  fee: bigint
}

export interface ArrivalTrade extends FinishedTransaction {
  /** Token units paid to the person. */
  received: bigint
  /** The contract's floor for this coin, which `received` meets. */
  floor: bigint
}

/** The trade pays less than the contract allows: prices moved since the quote. Nothing was signed. */
export class BelowFloorError extends Error {
  constructor(
    readonly offered: bigint,
    readonly floor: bigint,
  ) {
    super(`Cauldron offers ${offered} token units for this BCH; the contract needs at least ${floor}`)
    this.name = 'BelowFloorError'
  }
}

/** The trade leaves too little BCH change to pay its own miner fee: build again with `short` more sats held back. */
export class FeeShortfallError extends Error {
  constructor(readonly short: bigint) {
    super(`The trade is ${short} sats short of its miner fee`)
    this.name = 'FeeShortfallError'
  }
}

/**
 * The Router's trade does not pay the person at the contract coin's own index, where the contract looks: nothing is
 * signed (a different layout would only fail the contract's check).
 */
export class TradeLayoutError extends Error {
  constructor() {
    super('The Cauldron trade does not pay you where the swap contract checks; nothing was sent')
    this.name = 'TradeLayoutError'
  }
}

function sourceOutputsOf(build: RouterBuild): Output[] {
  return build.source_outputs.map((o) => ({
    lockingBytecode: hexToBin(o.locking_script_hex),
    valueSatoshis: BigInt(o.value),
    ...(o.token ? { token: { category: hexToBin(o.token.category), amount: BigInt(o.token.amount) } } : {}),
  }))
}

const total = (values: bigint[]) => values.reduce((a, b) => a + b, 0n)
const feeOf = (transaction: TransactionCommon, sourceOutputs: Output[]) =>
  total(sourceOutputs.map((o) => o.valueSatoshis)) - total(transaction.outputs.map((o) => o.valueSatoshis))

function finish(transaction: TransactionCommon, sourceOutputs: Output[]): FinishedTransaction {
  const encoded = encodeTransaction(transaction)
  return {
    transaction,
    sourceOutputs,
    hex: binToHex(encoded),
    txid: binToHex(hash256(encoded).reverse()),
    size: encoded.length,
    fee: feeOf(transaction, sourceOutputs),
  }
}

/**
 * The Router's trade, finished: the contract's unlock (the trade key's signature; the contract checks the output at
 * the coin's own index, where the Router puts the bought tokens), and the miner fee topped up from the person's BCH
 * change. The Router prices its fee for a wallet
 * signature (~107 bytes); the contract's unlock is longer, so without the top-up the trade would pay under
 * 1 sat/byte and the network would refuse it. Nothing in the trade signs over the change except the trade key,
 * which signs last.
 */
export function completeArrivalTrade(params: {
  build: RouterBuild
  contract: ArrivalContract
  terms: ArrivalTerms
  tradePrivateKey: string
}): ArrivalTrade {
  const { build, contract, terms } = params
  const decoded = decodeTransaction(hexToBin(build.unsigned_tx_hex))
  if (typeof decoded === 'string') throw new Error(`The Router's transaction could not be read: ${decoded}`)
  const sourceOutputs = sourceOutputsOf(build)
  const [ours, ...others] = build.inputs_to_sign
  if (ours === undefined || others.length) throw new Error('The trade must spend exactly one contract coin')
  const coin = sourceOutputs[ours]
  if (!coin || binToHex(coin.lockingBytecode) !== binToHex(contract.lockingBytecode)) {
    throw new Error('The Router funded the trade from a coin that is not this swap’s contract')
  }

  const floor = arrivalFloor(terms, coin.valueSatoshis)
  const owner = terms.owner.toLowerCase()
  const pays = (o: TransactionCommon['outputs'][number]) => binToHex(o.lockingBytecode) === owner
  // The contract pays out at the coin's own index (so two coins can never share one payout).
  const payout = decoded.outputs[ours]
  if (!payout?.token || !pays(payout) || binToHex(payout.token.category) !== terms.tokenCategory) {
    throw new TradeLayoutError()
  }
  const offered = payout.token.amount
  if (offered < floor) throw new BelowFloorError(offered, floor)

  // The fee, measured with an unlock of the final size (a signature is always 65 bytes with its type).
  const transaction: TransactionCommon = {
    ...decoded,
    inputs: decoded.inputs.map((input, i) =>
      i === ours ? { ...input, unlockingBytecode: placeholderUnlock(contract, 'swap') } : input,
    ),
    outputs: [...decoded.outputs],
  }
  const needed = BigInt(encodeTransaction(transaction).length) * FEE_RATE + FEE_MARGIN_SATS
  const short = needed - feeOf(transaction, sourceOutputs)
  if (short > 0n) {
    const changeIndex = transaction.outputs.length - 1
    const change = transaction.outputs[changeIndex]
    if (!change || change.token || !pays(change) || changeIndex === ours) throw new FeeShortfallError(short)
    if (change.valueSatoshis - short >= DUST_SATS) {
      transaction.outputs[changeIndex] = { ...change, valueSatoshis: change.valueSatoshis - short }
    } else if (change.valueSatoshis >= short) {
      // Too little change left to be worth an output: all of it goes to the fee.
      transaction.outputs.splice(changeIndex, 1)
    } else {
      throw new FeeShortfallError(short - change.valueSatoshis)
    }
  }

  const unlocking = unlockSwap(
    contract,
    { inputIndex: ours, sourceOutputs, transaction },
    params.tradePrivateKey,
  )
  transaction.inputs[ours] = {
    ...(transaction.inputs[ours] as TransactionCommon['inputs'][number]),
    unlockingBytecode: unlocking,
  }
  return { ...finish(transaction, sourceOutputs), received: offered, floor }
}

/**
 * The BCH back to the person, in one input and one output: `release` (the trade key, any time) or `reclaim`
 * (anyone, once the chain's median time passes the refund time). The fee is 1 sat/byte, far under the contract's
 * 3,000-sat cap.
 */
export function buildArrivalReturn(params: {
  contract: ArrivalContract
  terms: ArrivalTerms
  coin: ArrivalCoin
  how: 'release' | 'reclaim'
  tradePrivateKey?: string
}): FinishedTransaction {
  const { contract, terms, coin, how } = params
  const sourceOutputs: Output[] = [{ lockingBytecode: contract.lockingBytecode, valueSatoshis: coin.value }]
  const placeholder = how === 'reclaim' ? unlockReclaim(contract) : placeholderUnlock(contract, 'release')
  const transaction: TransactionCommon = {
    version: 2,
    locktime: how === 'reclaim' ? terms.refundAfter : 0,
    inputs: [
      {
        outpointTransactionHash: hexToBin(coin.txid),
        outpointIndex: coin.vout,
        sequenceNumber: how === 'reclaim' ? RECLAIM_SEQUENCE : FINAL_SEQUENCE,
        unlockingBytecode: placeholder,
      },
    ],
    outputs: [{ lockingBytecode: hexToBin(terms.owner), valueSatoshis: coin.value }],
  }
  const fee = BigInt(encodeTransaction(transaction).length) * FEE_RATE + FEE_MARGIN_SATS
  if (coin.value - fee < DUST_SATS) throw new Error('This coin is too small to send back')
  transaction.outputs[0] = { lockingBytecode: hexToBin(terms.owner), valueSatoshis: coin.value - fee }
  const context = { inputIndex: 0, sourceOutputs, transaction }
  const unlocking =
    how === 'reclaim'
      ? unlockReclaim(contract)
      : unlockRelease(contract, context, required(params.tradePrivateKey, 'the trade key'))
  transaction.inputs[0] = {
    ...(transaction.inputs[0] as TransactionCommon['inputs'][number]),
    unlockingBytecode: unlocking,
  }
  return finish(transaction, sourceOutputs)
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what}`)
  return value
}
