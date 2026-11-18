import {
  bigIntToVmNumber,
  binToHex,
  type CompilationContextBch,
  encodeDataPush,
  encodeLockingBytecodeP2sh20,
  generateSigningSerializationBch,
  hash160,
  hash256,
  hexToBin,
  lockingBytecodeToCashAddress,
  secp256k1,
  validateSecp256k1PrivateKey,
} from '@bitauth/libauth'
import { BCH_ADDRESS_PREFIX } from '@/lib/constants/chains'
import artifact from './swap-on-arrival.artifact.json'

/**
 * Hashi's swap-on-arrival contract (contracts/swap-on-arrival.cash), encoded with libauth alone: the app ships the
 * compiled bytecode (a 2 KB artifact), never the CashScript compiler or SDK. The encoding follows CashScript 0.14
 * exactly (constructor arguments pushed in reverse before the bytecode; function arguments in reverse, then the
 * function's index, then the redeem script), and contract.test.ts checks it byte for byte against the SDK.
 *
 * P2SH20, because THORChain pays only 20-byte script hashes (checked live 2026-11-18). The address-collision attack
 * on P2SH20 needs whoever picks the parameters to grind ~80 bits of them; here the browser picks every one,
 * including a fresh random trade key, so there is nothing for anyone else to grind.
 */

/** What one swap's contract promises. Everything is chosen in the person's browser when the swap starts. */
export interface ArrivalTerms {
  /** The token's category id as explorers show it (the contract compares it byte-reversed, as the VM reads it). */
  tokenCategory: string
  /** The person's locking bytecode (hex): where the token goes, and where the BCH goes back. */
  owner: string
  /** The one-swap trade key's public key (hex, compressed). */
  tradePublicKey: string
  /**
   * The floor, in token base units: `rateNum` (the review's "you get at least") for a coin of `rateDen` sats or more
   * (the least BCH the bridge promised), pro rata for a smaller coin. Decimal strings: the record stays plain data.
   */
  rateNum: string
  rateDen: string
  /** Unix seconds after which anyone may send the BCH back to the person (once the chain's median time passes). */
  refundAfter: number
}

export interface ArrivalContract {
  redeemScript: Uint8Array
  lockingBytecode: Uint8Array
  /** `bitcoincash:p…`: what the bridge pays. */
  address: string
}

/** Signing type for the trade key: all outputs, plus every coin spent (CashScript's default, SIGHASH_ALL|UTXOS|FORKID). */
const SIGHASH_TYPE = 0x61

const FUNCTION_INDEX = Object.fromEntries(artifact.abi.map((f, i) => [f.name, i])) as Record<
  'swap' | 'release' | 'reclaim',
  number
>

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

const pushInt = (value: bigint) => encodeDataPush(bigIntToVmNumber(value))

/** The compiled bytecode (the artifact keeps it as hex, so no opcode table reaches the browser). */
const BASE_SCRIPT: Uint8Array = hexToBin(artifact.bytecodeHex)

/** The category bytes in the order the VM's token introspection returns them. */
export function vmCategory(displayHex: string): Uint8Array {
  return hexToBin(displayHex).reverse()
}

/** The person's terms as the contract's constructor arguments, in the artifact's order. */
function constructorPushes(terms: ArrivalTerms): Uint8Array[] {
  const values: Record<string, Uint8Array> = {
    tokenCategory: encodeDataPush(vmCategory(terms.tokenCategory)),
    owner: encodeDataPush(hexToBin(terms.owner)),
    tradeKey: encodeDataPush(hexToBin(terms.tradePublicKey)),
    rateNum: pushInt(BigInt(terms.rateNum)),
    rateDen: pushInt(BigInt(terms.rateDen)),
    refundAfter: pushInt(BigInt(terms.refundAfter)),
  }
  return artifact.constructorInputs.map((input) => {
    const push = values[input.name]
    if (!push) throw new Error(`The contract artifact expects an unknown argument: ${input.name}`)
    return push
  })
}

export function arrivalContract(terms: ArrivalTerms): ArrivalContract {
  const redeemScript = concat([...constructorPushes(terms).reverse(), BASE_SCRIPT])
  const lockingBytecode = encodeLockingBytecodeP2sh20(hash160(redeemScript))
  const encoded = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix: BCH_ADDRESS_PREFIX })
  if (typeof encoded === 'string') throw new Error(encoded)
  return { redeemScript, lockingBytecode, address: encoded.address }
}

/** The least token amount `swap` accepts for a coin of `valueSats`: the contract's own arithmetic. */
export function arrivalFloor(terms: Pick<ArrivalTerms, 'rateNum' | 'rateDen'>, valueSats: bigint): bigint {
  const promised = BigInt(terms.rateNum)
  const proRata = (valueSats * promised) / BigInt(terms.rateDen)
  // biome-ignore lint/complexity/useMathMinMax: bigints; Math.min takes numbers only
  return proRata < promised ? proRata : promised
}

/** A fresh one-swap trade key. Kept with the swap's record in this browser; it can only ever pay the person. */
export function newTradeKey(): { privateKey: string; publicKey: string } {
  for (;;) {
    const privateKey = crypto.getRandomValues(new Uint8Array(32))
    if (!validateSecp256k1PrivateKey(privateKey)) continue
    const publicKey = secp256k1.derivePublicKeyCompressed(privateKey)
    if (typeof publicKey === 'string') continue
    return { privateKey: binToHex(privateKey), publicKey: binToHex(publicKey) }
  }
}

/** The trade key's signature over input `inputIndex` (Schnorr, SIGHASH_ALL|UTXOS|FORKID), as the contract checks it. */
function tradeSignature(context: CompilationContextBch, redeemScript: Uint8Array, privateKey: string) {
  const serialization = generateSigningSerializationBch(context, {
    coveredBytecode: redeemScript,
    signingSerializationType: Uint8Array.of(SIGHASH_TYPE),
  })
  const signature = secp256k1.signMessageHashSchnorr(hexToBin(privateKey), hash256(serialization))
  if (typeof signature === 'string') throw new Error(signature)
  return Uint8Array.from([...signature, SIGHASH_TYPE])
}

/** `args` are the function's arguments in the artifact's order, already encoded as pushes. */
function unlocking(contract: ArrivalContract, fn: keyof typeof FUNCTION_INDEX, args: Uint8Array[]) {
  return concat([
    ...args.reverse(),
    pushInt(BigInt(FUNCTION_INDEX[fn])),
    encodeDataPush(contract.redeemScript),
  ])
}

/** `swap(tradeSig)`: the trade key signs, and the output at this coin's own index must pay the person ≥ the floor. */
export function unlockSwap(
  contract: ArrivalContract,
  context: CompilationContextBch,
  tradePrivateKey: string,
): Uint8Array {
  const signature = tradeSignature(context, contract.redeemScript, tradePrivateKey)
  return unlocking(contract, 'swap', [encodeDataPush(signature)])
}

/** `release(tradeSig)`: the trade key sends the coin back to the person (one input, one output). */
export function unlockRelease(
  contract: ArrivalContract,
  context: CompilationContextBch,
  tradePrivateKey: string,
): Uint8Array {
  const signature = tradeSignature(context, contract.redeemScript, tradePrivateKey)
  return unlocking(contract, 'release', [encodeDataPush(signature)])
}

/** `reclaim()`: after the refund time, anyone sends the coin back to the person. No signature. */
export function unlockReclaim(contract: ArrivalContract): Uint8Array {
  return unlocking(contract, 'reclaim', [])
}

/**
 * An unlock of the final size with a blank signature, for measuring a transaction's fee before it is signed (a
 * Schnorr signature is always 65 bytes with its type byte).
 */
export function placeholderUnlock(contract: ArrivalContract, fn: 'swap' | 'release'): Uint8Array {
  return unlocking(contract, fn, [encodeDataPush(new Uint8Array(65))])
}
