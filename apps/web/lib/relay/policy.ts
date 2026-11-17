import { z } from 'zod'
import { STABLES, type StableAsset } from '@/lib/constants/assets'
import type { NearStatusResponse } from '@/lib/providers/near'

/**
 * What Hashi's gas relayer agrees to submit. It pays gas only for one thing: a USDC `transferWithAuthorization`
 * (EIP-3009) that funds a live NEAR Intents deposit address waiting for exactly that USDC. Everything else is
 * refused, so the relayer cannot be used to move arbitrary funds or burn its gas.
 */

/** Chains where the relayer runs. Base: USDC there exposes EIP-3009 (checked on-chain 2026-11-16). */
export const RELAY_CHAIN_IDS = [8453] as const

/** An authorisation may be valid for at most this long, so a signed-but-unused one soon expires. */
export const MAX_VALIDITY_SECONDS = 3600

const hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/)
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
const uint = z.string().regex(/^\d+$/)

export const relayRequestSchema = z.object({
  chainId: z.number(),
  from: address,
  to: address,
  value: uint,
  validAfter: uint,
  validBefore: uint,
  nonce: hex32,
  v: z.number().int().min(27).max(28),
  r: hex32,
  s: hex32,
})
export type RelayRequest = z.infer<typeof relayRequestSchema>

const CHAIN_OF: Record<number, StableAsset['chain']> = { 8453: 'base' }

export function usdcOn(chainId: number): StableAsset | undefined {
  const chain = CHAIN_OF[chainId]
  return STABLES.find((s) => s.chain === chain && s.symbol === 'USDC')
}

/**
 * Checks that need no network: chain, timing. Returns a refusal message, or undefined when the request may go on
 * to the on-chain and NEAR checks.
 */
export function checkStatic(req: RelayRequest, nowSeconds: number): string | undefined {
  if (!(RELAY_CHAIN_IDS as readonly number[]).includes(req.chainId))
    return 'The relayer does not run on this chain'
  if (!usdcOn(req.chainId)) return 'No USDC on this chain'
  const validAfter = Number(req.validAfter)
  const validBefore = Number(req.validBefore)
  if (validAfter > nowSeconds) return 'This authorisation is not valid yet'
  if (validBefore <= nowSeconds) return 'This authorisation has expired'
  if (validBefore - nowSeconds > MAX_VALIDITY_SECONDS) return 'This authorisation is valid for too long'
  if (BigInt(req.value) <= 0n) return 'Nothing to send'
  return undefined
}

/** The deposit address must be a NEAR quote waiting for this chain's USDC, and the value must cover it. */
export function checkNearDeposit(req: RelayRequest, status: NearStatusResponse): string | undefined {
  if (status.status !== 'PENDING_DEPOSIT') return 'This deposit address is not waiting for a deposit'
  const usdc = usdcOn(req.chainId)
  if (!usdc || status.quoteResponse?.quoteRequest?.originAsset !== usdc.nearAssetId) {
    return 'This deposit address is not for USDC on this chain'
  }
  const minIn = status.quoteResponse.quote?.minAmountIn
  const minimum = minIn ? BigInt(minIn) : undefined
  if (minimum === undefined || BigInt(req.value) < minimum) return 'The amount does not cover this deposit'
  return undefined
}

/** A small in-memory limiter: at most `limit` requests per key per window. Enough for one server instance. */
export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return false
    }
    recent.push(now)
    hits.set(key, recent)
    return true
  }
}
