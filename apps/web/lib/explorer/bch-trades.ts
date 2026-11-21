import {
  binToHex,
  cashAddressToLockingBytecode,
  decodeTransaction,
  hexToBin,
  lockingBytecodeToCashAddress,
  type Output,
  type TransactionCommon,
} from '@bitauth/libauth'
import { addressHistory, rawTransaction } from '@/lib/bch/electrum'
import { BCH_ASSETS } from '@/lib/constants/assets'

/**
 * The Bitcoin Cash side of a swap, read from the chain. A bridge sees only BCH: a swap that sold PUSD or MUSD to pay
 * it, or bought them with what it delivered, looks like plain BCH to NEAR Intents. The Cauldron trade on either side
 * is on the chain, and it says which token moved and how much.
 */

export type TokenAsset = 'PUSD' | 'MUSD'

/** A Cauldron trade, as the person saw it: PUSD or MUSD sold into the pools, or bought out of them. */
export interface PoolTrade {
  txid: string
  asset: TokenAsset
  side: 'sell' | 'buy'
  /** In whole tokens, as text (PUSD and MUSD have two decimals). */
  amount: string
}

const TOKENS: TokenAsset[] = ['PUSD', 'MUSD']
/** A two-step sale sends on the BCH it produced less the send's own fee (300 sats); a little room above that. */
const SALE_TO_DEPOSIT_SLACK_SATS = 2_000n
/** How far back before the deposit a two-step sale can be: it is confirmed in the same block or just before. */
const SALE_WINDOW_BLOCKS = 6

const decoded = new Map<string, Promise<TransactionCommon>>()

/** A transaction never changes once seen: each is fetched and decoded once for the life of the server. */
function readTx(txid: string): Promise<TransactionCommon> {
  let pending = decoded.get(txid)
  if (!pending) {
    pending = rawTransaction(txid).then((hex) => {
      const tx = decodeTransaction(hexToBin(hex))
      if (typeof tx === 'string') throw new Error(`Could not read ${txid}: ${tx}`)
      return tx
    })
    pending.catch(() => decoded.delete(txid))
    decoded.set(txid, pending)
  }
  return pending
}

const isP2pkh = (bytecode: Uint8Array) =>
  bytecode.length === 25 && bytecode[0] === 0x76 && bytecode[1] === 0xa9 && bytecode[24] === 0xac

const sameBytes = (a: Uint8Array, b: Uint8Array) => Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0

/** libauth keeps outpoint hashes in the order block explorers print them. */
const parentOf = (input: TransactionCommon['inputs'][number]) => binToHex(input.outpointTransactionHash)

async function spentOutput(input: TransactionCommon['inputs'][number]): Promise<Output | undefined> {
  return (await readTx(parentOf(input))).outputs[input.outpointIndex]
}

/** Tokens of this category held by pools (any locking script but a person's P2PKH) in a set of outputs. */
function poolUnits(outputs: (Output | undefined)[], category: string): bigint {
  let units = 0n
  for (const o of outputs) {
    if (o?.token && binToHex(o.token.category) === category && !isP2pkh(o.lockingBytecode))
      units += o.token.amount
  }
  return units
}

const asText = (units: bigint, asset: TokenAsset) =>
  (Number(units) / 10 ** BCH_ASSETS[asset].decimals).toFixed(BCH_ASSETS[asset].decimals)

/**
 * What a transaction did in Cauldron's PUSD or MUSD pools, or null when it touched neither. The pools' token balance
 * after the trade against before it: more tokens in the pools is a sale by the person, fewer is a purchase.
 */
export async function poolTrade(txid: string): Promise<PoolTrade | null> {
  const tx = await readTx(txid)
  for (const asset of TOKENS) {
    const category = BCH_ASSETS[asset].category
    if (!category) continue
    const after = poolUnits(tx.outputs, category)
    if (after === 0n && !tx.outputs.some((o) => o.token && binToHex(o.token.category) === category)) continue
    const before = poolUnits(await Promise.all(tx.inputs.map(spentOutput)), category)
    if (after === before) continue
    return after > before
      ? { txid, asset, side: 'sell', amount: asText(after - before, asset) }
      : { txid, asset, side: 'buy', amount: asText(before - after, asset) }
  }
  return null
}

function paidTo(tx: TransactionCommon, address: string): bigint {
  const target = cashAddressToLockingBytecode(address)
  if (typeof target === 'string') return 0n
  return tx.outputs.reduce(
    (sum, o) => (sameBytes(o.lockingBytecode, target.bytecode) ? sum + o.valueSatoshis : sum),
    0n,
  )
}

/** The BCH (no token) a transaction paid to this locking script. */
function bchTo(tx: TransactionCommon, locking: Uint8Array): bigint[] {
  return tx.outputs.flatMap((o) =>
    !o.token && sameBytes(o.lockingBytecode, locking) ? [o.valueSatoshis] : [],
  )
}

/** The sale paid the person the deposit plus at most the send's fee; anything else is not that sale. */
const matchesDeposit = (proceeds: bigint, paid: bigint) =>
  proceeds >= paid && proceeds - paid <= SALE_TO_DEPOSIT_SLACK_SATS

/**
 * A swap out of Bitcoin Cash that began as PUSD or MUSD: the sale that produced the BCH the bridge received.
 * One approval: the deposit is itself the sale (it paid the bridge's address straight from the pools).
 * Two approvals: a sale paid the person the deposit's amount plus the send's fee a few blocks before (or in the same
 * block), and the deposit followed. The deposit may spend that very coin or any other BCH in the wallet, so the sale
 * is found by its amount among the sender's transactions just before, not by the coin.
 * Null for a deposit of plain BCH.
 */
export async function saleBehindDeposit(
  depositTxid: string,
  depositAddress: string,
): Promise<PoolTrade | null> {
  const own = await poolTrade(depositTxid)
  if (own?.side === 'sell') return own
  const deposit = await readTx(depositTxid)
  const paid = paidTo(deposit, depositAddress)
  if (paid === 0n) return null
  const senders = new Map<string, Uint8Array>()
  for (const input of deposit.inputs) {
    const spent = await spentOutput(input)
    if (spent && !spent.token && isP2pkh(spent.lockingBytecode))
      senders.set(binToHex(spent.lockingBytecode), spent.lockingBytecode)
  }
  let best: { trade: PoolTrade; gap: bigint } | undefined
  for (const locking of senders.values()) {
    const address = lockingBytecodeToCashAddress({ bytecode: locking, prefix: 'bitcoincash' })
    if (typeof address === 'string') continue
    const history = await addressHistory(address.address)
    const at = history.find((h) => h.txid === depositTxid)?.height ?? 0
    // Confirmed in the same block or up to SALE_WINDOW_BLOCKS before; a deposit still in the mempool looks at the
    // mempool and the latest few confirmed transactions.
    const confirmed = history.filter((h) => h.height > 0)
    const floor = at > 0 ? at - SALE_WINDOW_BLOCKS : (confirmed.at(-SALE_WINDOW_BLOCKS)?.height ?? 0)
    const candidates = history.filter(
      (h) =>
        h.txid !== depositTxid &&
        (h.height <= 0 ? at <= 0 : h.height >= floor && (at <= 0 || h.height <= at)),
    )
    for (const h of candidates) {
      const proceeds = bchTo(await readTx(h.txid), locking).filter((v) => matchesDeposit(v, paid))
      if (!proceeds.length) continue
      const trade = await poolTrade(h.txid)
      if (trade?.side !== 'sell') continue
      // The closest match wins (amounts are bigint, so no Math.min).
      for (const value of proceeds) {
        const gap = value - paid
        if (!best || gap < best.gap) best = { trade, gap }
      }
    }
  }
  return best?.trade ?? null
}

/**
 * A swap into Bitcoin Cash that the person finished in their own wallet: the Cauldron purchase that spent the BCH the
 * bridge delivered to them. Null while that BCH has not moved, or when it moved some other way.
 */
export async function purchaseAfterDelivery(
  recipient: string,
  deliveryTxid: string,
): Promise<PoolTrade | null> {
  const delivery = await readTx(deliveryTxid)
  const target = cashAddressToLockingBytecode(recipient)
  if (typeof target === 'string') return null
  const delivered = delivery.outputs.flatMap((o, i) =>
    sameBytes(o.lockingBytecode, target.bytecode) ? [i] : [],
  )
  if (!delivered.length) return null
  const history = await addressHistory(recipient)
  const at = history.find((h) => h.txid === deliveryTxid)?.height ?? 0
  const later = history.filter((h) => h.txid !== deliveryTxid && (h.height <= 0 || at <= 0 || h.height >= at))
  for (const h of later) {
    const tx = await readTx(h.txid)
    const spends = tx.inputs.some(
      (input) => parentOf(input) === deliveryTxid && delivered.includes(input.outpointIndex),
    )
    if (!spends) continue
    const trade = await poolTrade(h.txid)
    return trade?.side === 'buy' ? trade : null
  }
  return null
}
