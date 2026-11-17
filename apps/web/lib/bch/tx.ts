import {
  binToHex,
  cashAddressToLockingBytecode,
  encodeTransaction,
  hexToBin,
  utf8ToBin,
} from '@bitauth/libauth'
import { sourceOutputToRelay } from '@wizardconnect/core/hdwalletv1-serialize'
import type { DappConnectionManager } from '@wizardconnect/dapp'
import type { WalletUtxo } from './wallet'

/**
 * Plain Bitcoin Cash transactions the wallet signs over WizardConnect: a payment to a bridge deposit address, and a
 * THORChain deposit. THORChain's rules for a BCH deposit (dev docs; Bifrost `client_internal.go`): the sender is
 * input 0 and must be single-signature; the vault is output 0; the memo is an OP_RETURN of at most 80 bytes;
 * change returns to input 0's address; an RBF-signalling sequence is only seen once mined, so sequences stay final.
 */

/** The smallest P2PKH output nodes relay. */
export const DUST_SATS = 546n
/** A signed P2PKH input with a Schnorr signature: 36 outpoint + 1 + 100 unlocking + 4 sequence. */
const P2PKH_INPUT_BYTES = 141n
const P2PKH_OUTPUT_BYTES = 34n
const TX_OVERHEAD_BYTES = 10n
const FEE_SATS_PER_BYTE = 1n
const FINAL_SEQUENCE = 0xffffffff
const MAX_MEMO_BYTES = 80

export interface Payment {
  address: string
  value: bigint
}

export interface PlannedTx {
  coins: WalletUtxo[]
  hex: string
  feeSats: bigint
  changeSats: bigint
  sizeBytes: bigint
}

export function lockingBytecode(address: string): Uint8Array {
  const result = cashAddressToLockingBytecode(address)
  if (typeof result === 'string') throw new Error(`Not a valid Bitcoin Cash address: ${address}`)
  return result.bytecode
}

/** OP_RETURN with one data push. */
export function opReturnScript(memo: string): Uint8Array {
  const data = utf8ToBin(memo)
  if (data.length > MAX_MEMO_BYTES)
    throw new Error(`The memo is ${data.length} bytes; THORChain allows at most 80`)
  const push = data.length <= 75 ? Uint8Array.of(data.length) : Uint8Array.of(0x4c, data.length)
  return Uint8Array.from([0x6a, ...push, ...data])
}

function outputBytes(script: Uint8Array) {
  return 8n + 1n + BigInt(script.length)
}

/**
 * Pays `payments` (in order, so the first is output 0) from plain BCH coins, adds an optional OP_RETURN memo, and
 * returns change to the first coin's address. Coins with tokens are never used. Fee: 1 sat per byte of the signed
 * size; change below dust is left to the miner. `first`: a coin at this address, when there is one, becomes input 0
 * (THORChain refunds to the address of input 0).
 */
export function planPayment(params: {
  coins: WalletUtxo[]
  payments: Payment[]
  memo?: string
  first?: string
}): PlannedTx {
  const byValue = params.coins.filter((c) => !c.token).sort((a, b) => (a.value > b.value ? -1 : 1))
  const preferred = byValue.filter((c) => c.address.plain === params.first)
  const pool = [...preferred, ...byValue.filter((c) => c.address.plain !== params.first)]
  const scripts = params.payments.map((p) => ({ script: lockingBytecode(p.address), value: p.value }))
  const memo = params.memo === undefined ? undefined : opReturnScript(params.memo)
  const paying = scripts.reduce((sum, s) => sum + s.value, 0n)
  const fixedBytes =
    TX_OVERHEAD_BYTES +
    scripts.reduce((sum, s) => sum + outputBytes(s.script), 0n) +
    (memo ? outputBytes(memo) : 0n)

  const chosen: WalletUtxo[] = []
  let total = 0n
  for (const coin of pool) {
    chosen.push(coin)
    total += coin.value
    const size = fixedBytes + P2PKH_INPUT_BYTES * BigInt(chosen.length) + P2PKH_OUTPUT_BYTES
    if (total >= paying + size * FEE_SATS_PER_BYTE) break
  }
  const first = chosen[0]
  if (!first) throw new Error('No Bitcoin Cash to pay with')

  const sizeWithChange = fixedBytes + P2PKH_INPUT_BYTES * BigInt(chosen.length) + P2PKH_OUTPUT_BYTES
  const sizeWithout = sizeWithChange - P2PKH_OUTPUT_BYTES
  let change = total - paying - sizeWithChange * FEE_SATS_PER_BYTE
  let size = sizeWithChange
  if (change < DUST_SATS) {
    change = 0n
    size = sizeWithout
    if (total < paying + sizeWithout * FEE_SATS_PER_BYTE) {
      throw new Error('Not enough Bitcoin Cash for this payment and its network fee')
    }
  }

  const outputs = [
    ...scripts.map((s) => ({ lockingBytecode: s.script, valueSatoshis: s.value })),
    ...(memo ? [{ lockingBytecode: memo, valueSatoshis: 0n }] : []),
    ...(change > 0n ? [{ lockingBytecode: hexToBin(first.address.lockingHex), valueSatoshis: change }] : []),
  ]
  const inputs = chosen.map((c) => ({
    outpointTransactionHash: hexToBin(c.txid),
    outpointIndex: c.vout,
    sequenceNumber: FINAL_SEQUENCE,
    unlockingBytecode: new Uint8Array(),
  }))
  const hex = binToHex(encodeTransaction({ version: 2, locktime: 0, inputs, outputs }))
  return { coins: chosen, hex, feeSats: total - paying - change, changeSats: change, sizeBytes: size }
}

/** Ask the wallet to sign every input of a planned transaction. Hashi broadcasts the result itself. */
export async function signPlanned(
  manager: DappConnectionManager,
  planned: PlannedTx,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const sourceOutputs = planned.coins.map((c) =>
    sourceOutputToRelay({
      outpointTransactionHash: hexToBin(c.txid),
      outpointIndex: c.vout,
      unlockingBytecode: new Uint8Array(),
      sequenceNumber: FINAL_SEQUENCE,
      valueSatoshis: c.value,
      lockingBytecode: hexToBin(c.address.lockingHex),
    }),
  )
  const inputPaths = planned.coins.map((c, i): [number, string, number] => [
    i,
    c.address.path,
    c.address.index,
  ])
  const response = await manager.signTransaction(
    {
      transaction: { transaction: planned.hex, sourceOutputs, broadcast: false, userPrompt: prompt },
      inputPaths,
    },
    signal ? { signal } : undefined,
  )
  if (response.error) throw new Error(response.error)
  return response.signedTransaction
}
