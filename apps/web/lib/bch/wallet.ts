import { binToHex, CashAddressType, encodeCashAddress, hash160 } from '@bitauth/libauth'
import type { DappConnectionManager } from '@wizardconnect/dapp'
import { BCH_ADDRESS_PREFIX } from '@/lib/constants/chains'
import { historyLength, listUnspent, type Utxo } from './electrum'

/**
 * The connected Bitcoin Cash wallet's addresses and coins. WizardConnect hands the dapp one xpub per path; each
 * address is derived from it (child 0 = receive, 1 = change), as the organiser's reference integration does.
 */

export type WalletPath = 'receive' | 'change'

const CHILD_INDEX: Record<WalletPath, number> = { receive: 0, change: 1 }

/** Stop scanning a path after this many unused addresses in a row: the gap limit wallets such as Cashonize use. */
const GAP_LIMIT = 20
/** A path is never read past this index (a wallet that far out is beyond any test or demo). */
const MAX_SCAN_PER_PATH = 400

/** Addresses seen used once stay used: later scans read their coins without asking about their history again. */
const knownUsed = new Set<string>()
/** Each path's last used index at the previous scan (keyed by the path's first address): rescans start from there. */
const lastUsedOf = new Map<string, number>()

export interface WalletAddress {
  path: WalletPath
  index: number
  /** `bitcoincash:q…`: receives BCH (NEAR Intents and THORChain pay here). */
  plain: string
  /** `bitcoincash:z…`: the same key, marked able to receive CashTokens (PUSD and MUSD go here). */
  token: string
  /** P2PKH locking script, hex: what the Cauldron Router needs as `script_hex`. */
  lockingHex: string
}

export interface WalletUtxo extends Utxo {
  address: WalletAddress
}

export function deriveAddress(
  manager: DappConnectionManager,
  path: WalletPath,
  index: number,
): WalletAddress | undefined {
  const pubkey = manager.getPubkey(CHILD_INDEX[path], BigInt(index))
  if (!pubkey) return undefined
  const payload = hash160(pubkey)
  const plain = encodeCashAddress({
    payload,
    prefix: BCH_ADDRESS_PREFIX,
    type: CashAddressType.p2pkh,
  }).address
  const token = encodeCashAddress({
    payload,
    prefix: BCH_ADDRESS_PREFIX,
    type: CashAddressType.p2pkhWithTokens,
  }).address
  // OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
  const lockingHex = `76a914${binToHex(payload)}88ac`
  return { path, index, plain, token, lockingHex }
}

export interface WalletScan {
  /** Every address with history, plus the first fresh one on each path. */
  addresses: WalletAddress[]
  utxos: WalletUtxo[]
}

async function everUsed(address: WalletAddress): Promise<boolean> {
  if (knownUsed.has(address.plain)) return true
  const used = (await historyLength(address.plain)) > 0
  if (used) knownUsed.add(address.plain)
  return used
}

/**
 * One path, read the way the wallet itself discovers it (addresses until GAP_LIMIT unused ones follow the last used
 * one), in as few round trips as it allows: the first window already covers two gaps past the last address used at
 * the previous scan, every history check in a window goes out at once, and coins are read in the same burst wherever
 * they are likely (the first gap and addresses known used). A used address found further out costs one more trip.
 * The earlier scan read each used address's coins one after another, which on a well-used wallet held the signature
 * prompt for seconds.
 */
async function scanPath(manager: DappConnectionManager, path: WalletPath) {
  const first = deriveAddress(manager, path, 0)
  if (!first) return { used: [] as WalletAddress[], fresh: undefined, utxos: [] as WalletUtxo[] }
  const reads = new Map<number, Promise<WalletUtxo[]>>()
  const read = (address: WalletAddress) => {
    if (!reads.has(address.index))
      reads.set(
        address.index,
        listUnspent(address.plain).then((coins) => coins.map((coin) => ({ ...coin, address }))),
      )
  }
  const used: WalletAddress[] = []
  let lastUsed = -1
  let from = 0
  let to = Math.min((lastUsedOf.get(first.plain) ?? -1) + 1 + 2 * GAP_LIMIT, MAX_SCAN_PER_PATH)
  while (from < to) {
    const window = Array.from({ length: to - from }, (_, i) => deriveAddress(manager, path, from + i)).filter(
      (a): a is WalletAddress => Boolean(a),
    )
    if (window.length === 0) break
    for (const address of window) if (address.index < GAP_LIMIT || knownUsed.has(address.plain)) read(address)
    const seen = await Promise.all(window.map(everUsed))
    window.forEach((address, i) => {
      if (!seen[i]) return
      lastUsed = address.index
      used.push(address)
      read(address)
    })
    from = to
    to = Math.min(lastUsed + 1 + GAP_LIMIT, MAX_SCAN_PER_PATH)
  }
  lastUsedOf.set(first.plain, lastUsed)
  const utxos = (await Promise.all(reads.values())).flat()
  return { used, fresh: deriveAddress(manager, path, lastUsed + 1), utxos }
}

/** The whole wallet, both paths at once: every address with history, the next fresh one on each path, every coin. */
export async function scanWallet(manager: DappConnectionManager): Promise<WalletScan> {
  const paths = await Promise.all((['receive', 'change'] as const).map((path) => scanPath(manager, path)))
  const addresses = paths.flatMap((p) => (p.fresh ? [...p.used, p.fresh] : p.used))
  // A coin read for an address that turned out unused has nothing in it; keep only real coins.
  const utxos = paths.flatMap((p) => p.utxos)
  return { addresses, utxos }
}

export function outpointKey(txid: string, vout: number) {
  return `${txid}:${vout}`
}
