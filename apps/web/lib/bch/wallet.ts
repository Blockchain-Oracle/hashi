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

/** Stop scanning a path after this many unused addresses in a row. */
const GAP_LIMIT = 10

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

/** Walk each path until `GAP_LIMIT` unused addresses in a row, and collect every coin on the used ones. */
export async function scanWallet(manager: DappConnectionManager): Promise<WalletScan> {
  const addresses: WalletAddress[] = []
  const utxos: WalletUtxo[] = []
  for (const path of ['receive', 'change'] as const) {
    let index = 0
    let unusedInARow = 0
    let firstFreshAdded = false
    while (unusedInARow < GAP_LIMIT) {
      const batch = Array.from({ length: GAP_LIMIT }, (_, i) =>
        deriveAddress(manager, path, index + i),
      ).filter((a): a is WalletAddress => Boolean(a))
      if (batch.length === 0) break
      const used = await Promise.all(batch.map((a) => historyLength(a.plain)))
      for (const [i, address] of batch.entries()) {
        if ((used[i] ?? 0) > 0) {
          unusedInARow = 0
          addresses.push(address)
          const coins = await listUnspent(address.plain)
          for (const coin of coins) utxos.push({ ...coin, address })
        } else {
          unusedInARow++
          if (!firstFreshAdded) {
            addresses.push(address)
            firstFreshAdded = true
          }
        }
      }
      index += batch.length
    }
  }
  return { addresses, utxos }
}

export function outpointKey(txid: string, vout: number) {
  return `${txid}:${vout}`
}
