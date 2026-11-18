import { binToHex, cashAddressToLockingBytecode } from '@bitauth/libauth'
import { type ArrivalTerms, arrivalContract, newTradeKey } from '@/lib/bch/arrival/contract'
import { BCH_ASSETS, type BchAssetId } from '@/lib/constants/assets'
import { ARRIVAL_REFUND_DELAY_MS } from '@/lib/constants/limits'
import type { SwapRecord } from './swap'

/**
 * Making a swap's contract (the swap page needs only this); trading from it lives in arrival.ts, which only the
 * pages that run swaps load.
 */

type Arrival = NonNullable<SwapRecord['arrival']>

/**
 * The contract for a new swap. The floor is the review's "you get at least" (`minTokens`), spread over the least BCH
 * the bridge promised (`minBridgeSats`): whatever the bridge delivers, the contract asks for at least that rate.
 */
export function prepareArrival(params: {
  bchAsset: BchAssetId
  /** The person's token-aware address: where PUSD or MUSD goes (and, as the same key, where BCH goes back). */
  ownerAddress: string
  minTokens: bigint
  minBridgeSats: bigint
  now: number
}): Arrival {
  const category = BCH_ASSETS[params.bchAsset].category
  if (!category) throw new Error('Plain BCH needs no swap contract')
  if (params.minTokens <= 0n || params.minBridgeSats <= 0n) throw new Error('This quote has no floor to hold')
  const owner = cashAddressToLockingBytecode(params.ownerAddress)
  if (typeof owner === 'string') throw new Error(`The receiving address cannot be read: ${owner}`)
  const key = newTradeKey()
  const terms: ArrivalTerms = {
    tokenCategory: category,
    owner: binToHex(owner.bytecode),
    tradePublicKey: key.publicKey,
    rateNum: params.minTokens.toString(),
    rateDen: params.minBridgeSats.toString(),
    refundAfter: Math.floor((params.now + ARRIVAL_REFUND_DELAY_MS) / 1000),
  }
  return { terms, address: arrivalContract(terms).address, tradeKey: key.privateKey }
}

/** The swap goes through its contract and its BCH is still there for Hashi to trade (not sent back). */
export function tradesOnArrival(record: SwapRecord): boolean {
  return record.arrival !== undefined && record.arrival.returnTxid === undefined
}

/**
 * Hands the contract's public terms to Hashi's server before any deposit is asked for, so its keeper can send the
 * BCH back to the person after the refund time even if this browser's record is lost. Throws if the server did not
 * keep them; the swap then pays the wallet instead (two approvals, nothing at risk).
 */
export async function registerArrival(arrival: Arrival): Promise<void> {
  const response = await fetch('/api/arrivals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ terms: arrival.terms }),
  })
  const body = (await response.json().catch(() => ({}))) as { address?: string; error?: string }
  if (!response.ok)
    throw new Error(body.error ?? `The server did not keep the swap contract (${response.status})`)
  if (body.address !== arrival.address) throw new Error('The server worked out a different contract address')
}
