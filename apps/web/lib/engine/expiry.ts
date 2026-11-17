import { CAULDRON_QUOTE_TTL_MS, NEAR_DEADLINE_MS } from '@/lib/constants/limits'
import type { SwapRecord } from './swap'

/**
 * When a swap that has moved nothing stops being usable: its bridge quote's deadline (NEAR's deposit address, or
 * THORChain's quote expiry), or an hour for one that starts with a Cauldron trade. Undefined once anything moved,
 * including a sale of PUSD or MUSD whose BCH is still to be sent on.
 */
export function quoteDeadline(record: SwapRecord): number | undefined {
  if (record.status !== 'quoted' || record.cauldronTxid) return undefined
  if (record.provider === 'near' && record.bridgeQuote) {
    const deadline = (record.bridgeQuote as { quote?: { deadline?: string } }).quote?.deadline
    const at = Date.parse(deadline ?? '')
    return Number.isFinite(at) ? at : record.createdAt + NEAR_DEADLINE_MS
  }
  if (record.provider === 'thorchain' && record.bridgeQuote) {
    return (record.bridgeQuote as { expiry: number }).expiry * 1000
  }
  return record.createdAt + CAULDRON_QUOTE_TTL_MS
}
