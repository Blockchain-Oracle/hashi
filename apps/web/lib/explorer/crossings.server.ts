import 'server-only'
import { cashAddressToLockingBytecode, decodeTransaction, hexToBin } from '@bitauth/libauth'
import { z } from 'zod'
import { addressHistory, rawTransaction } from '@/lib/bch/electrum'
import { BCH_ASSETS, type BchAssetId, NEAR_BCH_ASSET_ID, STABLES } from '@/lib/constants/assets'
import type { ChainId } from '@/lib/constants/chains'
import { nearIntentsUrl, txUrl } from '@/lib/constants/explorers'
import { serverEnv } from '@/lib/env.server'

/**
 * Every swap made through Hashi, for /explorer: NEAR Intents' own records of the swaps carrying Hashi's referral
 * (its Explorer API, read with Hashi's partner key), and, for a swap into PUSD or MUSD that paid a swap contract, the
 * contract's Cauldron trade read off the Bitcoin Cash chain. Nothing here comes from a browser, so nothing here can be
 * made up: each row is a provider's record or a chain transaction, linked.
 */

const EXPLORER_URL = 'https://explorer.near-intents.org/api/v0/transactions'
const REFERRAL = 'hashi'
/** NEAR allows one Explorer request every 5 s per partner; the page reads a copy at most a minute old. */
const CACHE_MS = 60_000
const MAX_ROWS = 200

/** The Explorer API lists hashes as strings; 1Click's status API wraps each in `{ hash }`. Both read as strings. */
const txHashes = z
  .array(z.union([z.string(), z.object({ hash: z.string() }).transform((h) => h.hash)]))
  .default([])

const nearRow = z.object({
  originAsset: z.string(),
  destinationAsset: z.string(),
  depositAddress: z.string(),
  recipient: z.string().nullable(),
  status: z.string(),
  createdAtTimestamp: z.number(),
  amountInFormatted: z.string(),
  amountOutFormatted: z.string(),
  amountInUsd: z.string().nullable().optional(),
  amountOutUsd: z.string().nullable().optional(),
  originChainTxHashes: txHashes,
  destinationChainTxHashes: txHashes,
})
type NearRow = z.infer<typeof nearRow>

export interface Side {
  amount: string
  asset: string
  chain: ChainId
  usd?: number
}

export interface Crossing {
  id: string
  at: number
  status: 'done' | 'refunded' | 'pending' | 'failed'
  direction: 'in' | 'out'
  pay: Side
  get: Side
  /** The BCH the bridge delivered, when the swap went on into PUSD or MUSD through a swap contract. */
  via?: Side
  links: { label: string; href: string }[]
}

export interface Ledger {
  crossings: Crossing[]
  /** False when the partner key is not set or NEAR's Explorer did not answer: the page says so. */
  live: boolean
  updatedAt: number
}

function side(assetId: string, amount: string, usd?: string | null): Side | undefined {
  const value = usd ? Number(usd) : undefined
  const base = value !== undefined && Number.isFinite(value) ? { usd: value } : {}
  if (assetId === NEAR_BCH_ASSET_ID) return { amount, asset: 'BCH', chain: 'bch', ...base }
  const stable = STABLES.find((s) => s.nearAssetId === assetId)
  return stable ? { amount, asset: stable.symbol, chain: stable.chain, ...base } : undefined
}

function status(near: string): Crossing['status'] {
  if (near === 'SUCCESS') return 'done'
  if (near === 'REFUNDED') return 'refunded'
  if (near === 'FAILED') return 'failed'
  return 'pending'
}

const p2pkh = (bytecode: Uint8Array) =>
  bytecode.length === 25 && bytecode[0] === 0x76 && bytecode[1] === 0xa9 && bytecode[24] === 0xac

/** A swap contract's Cauldron trade, once found, never changes: kept for the life of the server. */
const tradeCache = new Map<string, { asset: BchAssetId; amount: string; txid: string } | null>()

/**
 * The swap contract's own trade: the transaction that spent the bridge's BCH, and the PUSD or MUSD it paid to the
 * person's wallet (a P2PKH output carrying the token). Null while the BCH has not moved, or when it went back as BCH.
 */
async function contractTrade(contract: string, deliveryTxid: string | undefined) {
  if (tradeCache.has(contract)) return tradeCache.get(contract) ?? null
  const history = await addressHistory(contract)
  const trade = history.find((h) => h.txid !== deliveryTxid)
  if (!trade) return null
  const decoded = decodeTransaction(hexToBin(await rawTransaction(trade.txid)))
  if (typeof decoded === 'string') return null
  const self = cashAddressToLockingBytecode(contract)
  for (const asset of ['PUSD', 'MUSD'] as const) {
    const category = BCH_ASSETS[asset].category
    const paid = decoded.outputs
      .filter(
        (o) =>
          o.token !== undefined &&
          Buffer.from(o.token.category).toString('hex') === category &&
          p2pkh(o.lockingBytecode) &&
          (typeof self === 'string' ||
            Buffer.compare(Buffer.from(self.bytecode), Buffer.from(o.lockingBytecode)) !== 0),
      )
      .reduce((sum, o) => sum + (o.token?.amount ?? 0n), 0n)
    if (paid > 0n) {
      const found = {
        asset,
        amount: (Number(paid) / 10 ** BCH_ASSETS[asset].decimals).toFixed(2),
        txid: trade.txid,
      }
      tradeCache.set(contract, found)
      return found
    }
  }
  tradeCache.set(contract, null)
  return null
}

async function toCrossing(row: NearRow): Promise<Crossing | undefined> {
  const pay = side(row.originAsset, row.amountInFormatted, row.amountInUsd)
  const get = side(row.destinationAsset, row.amountOutFormatted, row.amountOutUsd)
  if (!pay || !get) return undefined
  const direction = pay.chain === 'bch' ? 'out' : 'in'
  const origin = row.originChainTxHashes[0]
  const delivery = row.destinationChainTxHashes[0]
  const links: Crossing['links'] = []
  if (origin)
    links.push({
      label: pay.chain === 'bch' ? 'Bitcoin Cash' : chainLabel(pay.chain),
      href: txUrl(pay.chain, origin),
    })
  links.push({ label: 'NEAR Intents', href: nearIntentsUrl(row.depositAddress) })
  if (delivery)
    links.push({
      label: get.chain === 'bch' ? 'Bitcoin Cash' : chainLabel(get.chain),
      href: txUrl(get.chain, delivery),
    })

  const crossing: Crossing = {
    id: row.depositAddress,
    at: row.createdAtTimestamp * 1000,
    status: status(row.status),
    direction,
    pay,
    get,
    links,
  }
  // Into a swap contract (a P2SH address): the person's PUSD or MUSD comes from the contract's own trade.
  if (direction === 'in' && row.recipient?.startsWith('bitcoincash:p') && crossing.status === 'done') {
    const trade = await contractTrade(row.recipient, delivery).catch(() => null)
    if (trade) {
      crossing.via = get
      crossing.get = { amount: trade.amount, asset: trade.asset, chain: 'bch' }
      crossing.links.push({ label: 'Cauldron trade', href: txUrl('bch', trade.txid) })
    }
  }
  return crossing
}

function chainLabel(chain: ChainId) {
  return chain.charAt(0).toUpperCase() + chain.slice(1)
}

let cached: Ledger | undefined
let pending: Promise<Ledger> | undefined

async function load(): Promise<Ledger> {
  const key = serverEnv.NEAR_INTENTS_EXPLORER_JWT
  if (!key) return { crossings: [], live: false, updatedAt: Date.now() }
  const url = `${EXPLORER_URL}?${new URLSearchParams({ referral: REFERRAL, numberOfTransactions: String(MAX_ROWS) })}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' })
  if (!response.ok) throw new Error(`NEAR Intents Explorer answered ${response.status}`)
  const rows = z.array(nearRow).parse(await response.json())
  const crossings = (await Promise.all(rows.map(toCrossing))).filter((c): c is Crossing => c !== undefined)
  crossings.sort((a, b) => b.at - a.at)
  return { crossings, live: true, updatedAt: Date.now() }
}

/** The ledger, at most a minute old. A failed refresh keeps the last good copy. */
export async function getLedger(): Promise<Ledger> {
  if (cached && Date.now() - cached.updatedAt < CACHE_MS) return cached
  pending ??= load()
    .then((ledger) => {
      cached = ledger
      return ledger
    })
    .catch(() => cached ?? { crossings: [], live: false, updatedAt: Date.now() })
    .finally(() => {
      pending = undefined
    })
  return pending
}
