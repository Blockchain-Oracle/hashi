import { z } from 'zod'
import { NEAR_ONE_CLICK_URL } from '@/lib/constants/providers'
import { fetchJson, ProviderError } from '@/lib/http'

/**
 * NEAR Intents 1Click API (https://docs.near-intents.org). Schemas follow its OpenAPI file (fetched 2026-11-16).
 * Called straight from the browser: every endpoint sends `access-control-allow-origin: *` and needs no key.
 */

const PROVIDER = 'NEAR Intents'

/**
 * NEAR's OpenAPI file (v0.1.10, read 2026-11-18) marks no field as nullable, but the live API sends `null` for
 * every optional field it has no value for yet: a status waiting for its deposit came back with eleven of them null
 * (`amountIn`, `amountOut`, `depositedAmount`, `refundReason`, `slippage`…). So every optional field here accepts
 * a missing key and `null` alike, and both read as "not set". Required fields stay strict: Hashi depends on them.
 */
const maybeText = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined)
const maybeNumber = z
  .number()
  .nullish()
  .transform((value) => value ?? undefined)
/** A list NEAR may leave out or send as `null`: both mean empty. */
const listOf = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((value) => value ?? [])

const tokenSchema = z.object({
  assetId: z.string(),
  decimals: z.number(),
  blockchain: z.string(),
  symbol: z.string(),
  price: z.number(),
  priceUpdatedAt: z.string(),
  contractAddress: maybeText,
})
export type NearToken = z.infer<typeof tokenSchema>

export function getNearTokens(signal?: AbortSignal) {
  return fetchJson(
    PROVIDER,
    `${NEAR_ONE_CLICK_URL}/v0/tokens`,
    z.array(tokenSchema),
    signal ? { signal } : {},
  )
}

export type NearSwapType = 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'FLEX_INPUT'

export interface NearQuoteInput {
  /** True for a price only: no deposit address is issued. */
  dry: boolean
  swapType: NearSwapType
  originAsset: string
  destinationAsset: string
  /** Base units of the origin asset (or of the destination asset for EXACT_OUTPUT). */
  amount: bigint
  recipient: string
  refundTo: string
  slippageBps: number
  deadline: Date
}

const quoteSchema = z.object({
  depositAddress: maybeText,
  depositMemo: maybeText,
  amountIn: z.string(),
  amountInFormatted: z.string(),
  amountInUsd: z.string(),
  minAmountIn: z.string(),
  amountOut: z.string(),
  amountOutFormatted: z.string(),
  amountOutUsd: z.string(),
  minAmountOut: z.string(),
  deadline: maybeText,
  timeWhenInactive: maybeText,
  /** Seconds, counted from when the deposit transaction is confirmed. */
  timeEstimate: z.number(),
  refundFee: maybeText,
  withdrawFee: maybeText,
})

const quoteResponseSchema = z.object({
  correlationId: z.string(),
  timestamp: z.string(),
  /** Must be kept with the quote: it is what settles a dispute. */
  signature: z.string(),
  quoteRequest: z.record(z.string(), z.unknown()),
  quote: quoteSchema,
})
export type NearQuoteResponse = z.infer<typeof quoteResponseSchema>

/** Who receives Hashi's swaps in NEAR's records. Not an account; just a label. */
const REFERRAL = 'hashi'

/**
 * In a browser, quotes go through Hashi's server (app/api/near/quote), which adds the partner key: quotes follow the
 * partner fee schedule and the key stays on the server. On the server, the same key is sent directly.
 */
function quoteRequest(): { url: string; headers: Record<string, string> } {
  if (typeof window !== 'undefined') return { url: '/api/near/quote', headers: {} }
  const key = process.env.NEAR_INTENTS_JWT
  return { url: `${NEAR_ONE_CLICK_URL}/v0/quote`, headers: key ? { 'x-api-key': key } : {} }
}

export async function getNearQuote(input: NearQuoteInput, signal?: AbortSignal): Promise<NearQuoteResponse> {
  const body = {
    dry: input.dry,
    swapType: input.swapType,
    slippageTolerance: input.slippageBps,
    originAsset: input.originAsset,
    depositType: 'ORIGIN_CHAIN',
    destinationAsset: input.destinationAsset,
    amount: input.amount.toString(),
    refundTo: input.refundTo,
    refundType: 'ORIGIN_CHAIN',
    recipient: input.recipient,
    recipientType: 'DESTINATION_CHAIN',
    deadline: input.deadline.toISOString(),
    referral: REFERRAL,
  }
  const { url, headers } = quoteRequest()
  try {
    return await fetchJson(PROVIDER, url, quoteResponseSchema, {
      method: 'POST',
      body,
      headers,
      ...(signal ? { signal } : {}),
    })
  } catch (error) {
    throw toMinimumError(error)
  }
}

/** NEAR's minimum shows up as text: "Amount is too low for bridge, try at least 150000" (base units). */
export class BelowMinimumError extends ProviderError {
  constructor(
    provider: string,
    message: string,
    readonly minimum: bigint,
  ) {
    super(provider, message)
    this.name = 'BelowMinimumError'
  }
}

function toMinimumError(error: unknown): unknown {
  if (error instanceof ProviderError) {
    const match = /try at least (\d+)/i.exec(error.message)
    if (match?.[1]) return new BelowMinimumError(error.provider, error.message, BigInt(match[1]))
  }
  return error
}

export const NEAR_STATUSES = [
  'KNOWN_DEPOSIT_TX',
  'PENDING_DEPOSIT',
  'INCOMPLETE_DEPOSIT',
  'PROCESSING',
  'SUCCESS',
  'REFUNDED',
  'FAILED',
] as const
/** A status NEAR documents, or `UNKNOWN` for one it adds later (kept in `statusText`, so it can be logged). */
export type NearStatus = (typeof NEAR_STATUSES)[number] | 'UNKNOWN'

const txDetailsSchema = z.object({ hash: z.string(), explorerUrl: z.string() })

const statusSchema = z
  .object({
    correlationId: z.string(),
    /**
     * The quote this deposit address belongs to (what it waits for, and its minimum). Only the relayer reads it, so
     * a shape it cannot read becomes "absent" (the relayer then refuses, the safe side) instead of failing the
     * status check that the tracker depends on.
     */
    quoteResponse: z
      .object({
        quoteRequest: z.record(z.string(), z.unknown()),
        quote: z.object({ minAmountIn: maybeText, depositAddress: maybeText }),
      })
      .partial()
      .nullish()
      .transform((value) => value ?? undefined)
      .catch(undefined),
    // A status NEAR adds later must not stop every check: it reads as UNKNOWN, and the raw text is kept.
    status: z.string(),
    updatedAt: z.string(),
    swapDetails: z.object({
      intentHashes: listOf(z.string()),
      nearTxHashes: listOf(z.string()),
      originChainTxHashes: listOf(txDetailsSchema),
      destinationChainTxHashes: listOf(txDetailsSchema),
      amountIn: maybeText,
      amountOut: maybeText,
      depositedAmount: maybeText,
      refundedAmount: maybeText,
      refundReason: maybeText,
      refundFee: maybeText,
      withdrawFee: maybeText,
      slippage: maybeNumber,
    }),
  })
  .transform(({ status, ...rest }) => ({
    ...rest,
    status: (NEAR_STATUSES as readonly string[]).includes(status) ? (status as NearStatus) : 'UNKNOWN',
    statusText: status,
  }))
export type NearStatusResponse = z.infer<typeof statusSchema>

/** Validates a status body: what `getNearStatus` does with NEAR's answer (exported for tests). */
export function parseNearStatus(body: unknown): NearStatusResponse {
  return statusSchema.parse(body)
}

export function getNearStatus(depositAddress: string, signal?: AbortSignal) {
  const url = `${NEAR_ONE_CLICK_URL}/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`
  return fetchJson(PROVIDER, url, statusSchema, signal ? { signal } : {})
}

/** Optional: telling NEAR the deposit's transaction hash can speed the swap up. */
export function submitNearDeposit(txHash: string, depositAddress: string) {
  return fetchJson(PROVIDER, `${NEAR_ONE_CLICK_URL}/v0/deposit/submit`, z.unknown(), {
    method: 'POST',
    body: { txHash, depositAddress },
  })
}
