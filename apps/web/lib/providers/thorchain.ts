import { z } from 'zod'
import { THORCHAIN_API_URL } from '@/lib/constants/providers'
import { fetchJson, ProviderError } from '@/lib/http'

/**
 * THORChain node API through Liquify's public gateway (https://dev.thorchain.org). Every amount THORChain speaks
 * is in 1e8 units, whatever the asset's own decimals. Called straight from the browser (CORS `*`, no key).
 */

const PROVIDER = 'THORChain'
export const THORCHAIN_DECIMALS = 8

const quoteSchema = z.object({
  inbound_address: z.string().optional(),
  inbound_confirmation_blocks: z.number().optional(),
  inbound_confirmation_seconds: z.number().optional(),
  outbound_delay_seconds: z.number().optional(),
  fees: z.object({
    asset: z.string(),
    affiliate: z.string(),
    outbound: z.string(),
    liquidity: z.string(),
    total: z.string(),
    slippage_bps: z.number(),
    total_bps: z.number(),
  }),
  router: z.string().optional(),
  expiry: z.number(),
  warning: z.string().optional(),
  dust_threshold: z.string().optional(),
  recommended_min_amount_in: z.string().optional(),
  memo: z.string().optional(),
  expected_amount_out: z.string(),
  total_swap_seconds: z.number().optional(),
})
export type ThorQuote = z.infer<typeof quoteSchema>

export interface ThorQuoteInput {
  fromAsset: string
  toAsset: string
  /** 1e8 units. */
  amount: bigint
  destination?: string
  /**
   * Where THORChain refunds a failed swap; without it, the address the deposit came from. It rides in the memo, so
   * it fits only a deposit from an EVM chain: a Bitcoin Cash memo (80 bytes) is too short ("generated memo too long
   * for source chain", checked live 2026-11-17).
   */
  refundAddress?: string
  /**
   * The person's max slippage, sent as `liquidity_tolerance_bps`: THORChain's swap guide calls it "the preferred
   * slippage parameter". `tolerance_bps` also counts the fixed outbound fee, so small swaps fail at 1%.
   */
  toleranceBps?: number
}

/**
 * THORChain's memo parser reads `bitcoincash:q…` as a broken number and refuses the quote ("cannot parse
 * 'bitcoincash' as an Address", checked live 2026-11-17), so Bitcoin Cash addresses go without their prefix.
 */
export function thorAddress(address: string): string {
  return address.replace(/^bitcoincash:/i, '')
}

export async function getThorQuote(input: ThorQuoteInput, signal?: AbortSignal): Promise<ThorQuote> {
  const params = new URLSearchParams({
    from_asset: input.fromAsset,
    to_asset: input.toAsset,
    amount: input.amount.toString(),
  })
  if (input.destination) params.set('destination', thorAddress(input.destination))
  if (input.refundAddress) params.set('refund_address', thorAddress(input.refundAddress))
  if (input.toleranceBps !== undefined) params.set('liquidity_tolerance_bps', String(input.toleranceBps))
  return fetchJson(
    PROVIDER,
    `${THORCHAIN_API_URL}/quote/swap?${params}`,
    quoteSchema,
    signal ? { signal } : {},
  )
}

const inboundSchema = z.array(
  z.object({
    chain: z.string(),
    address: z.string(),
    router: z.string().optional(),
    halted: z.boolean(),
    chain_trading_paused: z.boolean(),
    chain_lp_actions_paused: z.boolean().optional(),
    outbound_fee: z.string().optional(),
    dust_threshold: z.string().optional(),
  }),
)
export type ThorInbound = z.infer<typeof inboundSchema>[number]

/** Per-chain vaults, routers and halts. Vaults rotate: always re-read before a deposit. */
export function getThorInbound(signal?: AbortSignal) {
  return fetchJson(
    PROVIDER,
    `${THORCHAIN_API_URL}/inbound_addresses`,
    inboundSchema,
    signal ? { signal } : {},
  )
}

const poolSchema = z.array(z.object({ asset: z.string(), status: z.string(), balance_asset: z.string() }))

export function getThorPools(signal?: AbortSignal) {
  return fetchJson(PROVIDER, `${THORCHAIN_API_URL}/pools`, poolSchema, signal ? { signal } : {})
}

const stagesSchema = z.object({
  inbound_observed: z.object({ completed: z.boolean() }).partial().optional(),
  inbound_confirmation_counted: z
    .object({ completed: z.boolean(), remaining_confirmation_seconds: z.number() })
    .partial()
    .optional(),
  inbound_finalised: z.object({ completed: z.boolean() }).partial().optional(),
  swap_status: z.object({ pending: z.boolean() }).partial().optional(),
  swap_finalised: z.object({ completed: z.boolean() }).partial().optional(),
  outbound_delay: z
    .object({ completed: z.boolean(), remaining_delay_seconds: z.number() })
    .partial()
    .optional(),
  outbound_signed: z.object({ completed: z.boolean() }).partial().optional(),
})

const statusSchema = z.object({
  tx: z.object({ id: z.string(), chain: z.string(), memo: z.string().optional() }).partial().optional(),
  planned_out_txs: z
    .array(z.object({ chain: z.string(), to_address: z.string(), refund: z.boolean().optional() }).partial())
    .optional(),
  out_txs: z
    .array(z.object({ id: z.string(), chain: z.string(), memo: z.string().optional() }).partial())
    .optional(),
  stages: stagesSchema,
})
export type ThorStatus = z.infer<typeof statusSchema>

/** THORChain wants the inbound hash upper-case and without `0x`. */
export function getThorStatus(inboundHash: string, signal?: AbortSignal) {
  const hash = inboundHash.replace(/^0x/i, '').toUpperCase()
  return fetchJson(PROVIDER, `${THORCHAIN_API_URL}/tx/status/${hash}`, statusSchema, signal ? { signal } : {})
}

const HALTS_TTL_MS = 30_000
let halts: { at: number; value: Promise<Set<string>> } | undefined

/** Chains whose trading THORChain has paused right now (read at most every 30 s). */
export function getThorHaltedChains(): Promise<Set<string>> {
  if (!halts || Date.now() - halts.at > HALTS_TTL_MS) {
    const value = getThorInbound().then(
      (chains) => new Set(chains.filter((c) => c.halted || c.chain_trading_paused).map((c) => c.chain)),
    )
    halts = { at: Date.now(), value }
    value.catch(() => {
      halts = undefined
    })
  }
  return halts.value
}

export function isThorHaltError(error: unknown) {
  return error instanceof ProviderError && /halt|paused/i.test(error.message)
}
