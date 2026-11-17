import { del, entries, get, set } from 'idb-keyval'
import type { BchAssetId, StableSymbol } from '@/lib/constants/assets'
import type { ExternalChainId } from '@/lib/constants/chains'
import type { Direction, RouteVia, SwapAddresses } from './types'

/**
 * One swap, from quote to the last transaction, saved in the browser (IndexedDB) after every step. Closing the tab
 * loses nothing: on return, the record says exactly which step comes next. Amounts are strings (base units) so the
 * record survives storage as plain data.
 */

export type SwapStatus =
  /** A real quote exists; nothing sent yet. */
  | 'quoted'
  /** The person's deposit transaction is out; the bridge has not reported it yet. */
  | 'deposit-sent'
  /** The bridge is working (NEAR PROCESSING / THORChain stages). */
  | 'bridging'
  /** BCH has landed on the person's address and waits to be swapped into PUSD or MUSD. */
  | 'bch-arrived'
  /** The Cauldron trade is out. */
  | 'swapping'
  | 'completed'
  | 'refunded'
  | 'failed'
  /** The quote ran out before the person's first approval: nothing was sent. */
  | 'expired'

export const TERMINAL: SwapStatus[] = ['completed', 'refunded', 'failed', 'expired']

export interface SwapEvent {
  at: number
  status: SwapStatus
  note: string
}

export interface SwapRecord {
  id: string
  createdAt: number
  updatedAt: number
  provider: RouteVia
  direction: Direction
  /** The stablecoin side of a bridged swap; absent when the swap stays on Bitcoin Cash. */
  stable?: { chain: ExternalChainId; symbol: StableSymbol }
  /** Bridged: the Bitcoin Cash side. Staying on Bitcoin Cash (`local`): what the person receives. */
  bchAsset: BchAssetId
  /** `local` only: the Bitcoin Cash asset the person pays. */
  bchFrom?: BchAssetId
  /** What the person pays, base units. */
  amountIn: string
  /** Forward NEAR with Base USDC: the person signs an EIP-3009 authorisation and Hashi's relayer pays the gas. */
  gasless?: boolean
  /** Approvals asked for so far (for the record of what the route really cost the person). */
  approvals: number
  addresses: SwapAddresses
  /** Where the deposit goes: NEAR's deposit address, or THORChain's vault. */
  depositAddress?: string
  /** THORChain only. */
  memo?: string
  router?: string
  /** NEAR's signed quote, kept whole: NEAR asks integrators to keep it to settle disputes. */
  bridgeQuote?: unknown
  depositTx?: string
  /** BCH arriving (forward) or leaving (reverse), and its amount. */
  bchTxid?: string
  bchSats?: string
  cauldronTxid?: string
  /** The stablecoin payout (reverse). */
  payoutTx?: string
  /** What actually arrived, base units of the receiving asset, once known. */
  receivedAmount?: string
  /** What the review showed when the person started: base units of the receiving asset, and the timing. */
  quoted?: { amountOut: string; minAmountOut: string; etaSeconds: number; feesUsd?: number }
  /** The person's slippage when they started (100 = 1%): every Cauldron trade and bridge quote is held to it. */
  slippageBps?: number
  status: SwapStatus
  events: SwapEvent[]
}

const PREFIX = 'hashi-swap:'

export async function saveSwap(record: SwapRecord): Promise<void> {
  await set(`${PREFIX}${record.id}`, record)
}

export async function loadSwaps(): Promise<SwapRecord[]> {
  const all = await entries<string, SwapRecord>()
  return all
    .filter(([key]) => typeof key === 'string' && key.startsWith(PREFIX))
    .map(([, value]) => value)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function loadSwap(id: string): Promise<SwapRecord | undefined> {
  return get<SwapRecord>(`${PREFIX}${id}`)
}

export async function deleteSwap(id: string): Promise<void> {
  await del(`${PREFIX}${id}`)
}

/** A new version of the record with `status` and one more event. */
export function advance(
  record: SwapRecord,
  status: SwapStatus,
  note: string,
  patch: Partial<SwapRecord> = {},
) {
  const at = Date.now()
  return { ...record, ...patch, status, updatedAt: at, events: [...record.events, { at, status, note }] }
}

export function isTerminal(record: SwapRecord) {
  return TERMINAL.includes(record.status)
}
