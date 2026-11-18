import { hexToBin, secp256k1 } from '@bitauth/libauth'
import { z } from 'zod'
import { BCH_ASSETS } from '@/lib/constants/assets'
import type { ArrivalTerms } from './contract'

/**
 * What Hashi's server accepts as a swap contract's public terms (POST /api/arrivals), so its keeper can send any BCH
 * left in the contract back to the person after the refund time. Only public data: the trade key's private half
 * never leaves the browser. Every check is about keeping junk out of the store; none of it can move money, because
 * the contract itself only ever pays its owner.
 */

const decimal = z.string().regex(/^[1-9][0-9]{0,17}$/)

export const arrivalTermsSchema = z.object({
  tokenCategory: z.string().regex(/^[0-9a-f]{64}$/),
  owner: z.string().regex(/^[0-9a-f]+$/),
  tradePublicKey: z.string().regex(/^0[23][0-9a-f]{64}$/),
  rateNum: decimal,
  rateDen: decimal,
  refundAfter: z.number().int(),
}) satisfies z.ZodType<ArrivalTerms>

/** The person's own kind of address: P2PKH, or a P2SH (20- or 32-byte) one. */
const OWNER_SCRIPT = /^(76a914[0-9a-f]{40}88ac|a914[0-9a-f]{40}87|aa20[0-9a-f]{64}87)$/

const TOKENS = new Set<string>(
  Object.values(BCH_ASSETS).flatMap((asset) => (asset.category ? [asset.category] : [])),
)

/** The latest refund time a new contract may name: its swap starts now and refunds within a few hours. */
const MAX_REFUND_AHEAD_S = 3 * 60 * 60

/** Why these terms are refused, or undefined when they are fine to keep. */
export function checkArrivalTerms(terms: ArrivalTerms, nowMs: number): string | undefined {
  if (!TOKENS.has(terms.tokenCategory)) return 'Not a token Hashi swaps into'
  if (!OWNER_SCRIPT.test(terms.owner)) return 'Not an address Hashi pays'
  if (!secp256k1.validatePublicKey(hexToBin(terms.tradePublicKey))) return 'Not a valid trade key'
  const now = Math.floor(nowMs / 1000)
  if (terms.refundAfter < now || terms.refundAfter > now + MAX_REFUND_AHEAD_S)
    return 'Refund time out of range'
  return undefined
}
