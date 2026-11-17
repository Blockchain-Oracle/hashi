import { CashAddressType, encodeCashAddress } from '@bitauth/libauth'
import { BCH_ADDRESS_PREFIX, type ChainKind } from '@/lib/constants/chains'

/**
 * Before wallets are connected, providers still need syntactically valid addresses to price a route. These belong
 * to nobody (no known key controls them), and they are only ever used in price-only requests: NEAR `dry: true` and
 * THORChain quotes, which move nothing.
 *
 * NEAR refuses well-known burn addresses (0x…0000, 0x…dEaD, Solana's 1111…1111) but accepts the "value one"
 * address on each chain; checked live on 2026-11-16.
 */

const ZERO_HASH = new Uint8Array(20)

export const PLACEHOLDER_ADDRESS: Record<ChainKind, string> = {
  evm: '0x0000000000000000000000000000000000000001',
  solana: '11111111111111111111111111111112',
  bch: encodeCashAddress({ payload: ZERO_HASH, prefix: BCH_ADDRESS_PREFIX, type: CashAddressType.p2pkh })
    .address,
}
