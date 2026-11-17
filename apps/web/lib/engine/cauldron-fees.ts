/**
 * What a Cauldron Router build costs on top of its quote. Measured from 11 real builds on 2026-11-16
 * (research: bridge-bch-leg-and-wallets.md §1.3–1.4):
 * - the Router fee is 0.1% of the BCH side of the pool trade (fee_sats 4,860 on a 4,860,352-sat buy);
 * - the miner fee is ~1 sat/byte, ≈ 260 sats plus ≈ 192 sats per pool (1 pool: 452–500; 22: 4,394; 48: 9,495);
 * - a bought token output carries 1,000 sats, which stay with the buyer.
 * Quotes include neither fee, so Hashi adds them itself before showing an amount.
 */

export const ROUTER_FEE_DIVISOR = 1000n
export const MINER_BASE_SATS = 260n
export const MINER_PER_POOL_SATS = 192n
export const TOKEN_OUTPUT_SATS = 1000n

export function minerFeeSats(pools: number): bigint {
  return MINER_BASE_SATS + MINER_PER_POOL_SATS * BigInt(Math.max(1, pools))
}

export function routerFeeSats(tradeSats: bigint): bigint {
  return tradeSats / ROUTER_FEE_DIVISOR
}

/**
 * How much of `availableSats` can go into the pools when buying tokens, so that the trade, the Router fee, the
 * miner fee and the token output's 1,000 sats all fit. Zero when they cannot.
 */
export function spendableForBuy(availableSats: bigint, pools: number): bigint {
  const left = availableSats - minerFeeSats(pools) - TOKEN_OUTPUT_SATS
  if (left <= 0n) return 0n
  return (left * ROUTER_FEE_DIVISOR) / (ROUTER_FEE_DIVISOR + 1n)
}

/** BCH a token sale leaves after the Router fee and the miner fee. */
export function proceedsFromSell(outputSats: bigint, pools: number): bigint {
  const left = outputSats - routerFeeSats(outputSats) - minerFeeSats(pools)
  return left > 0n ? left : 0n
}

/**
 * Token-for-token trades (PUSD ⇄ MUSD), measured on a live unsigned build on 2026-11-16 (10 PUSD → 9.74 MUSD over
 * 54 pools): the Router's 0.1% fee is taken in the sold token, on top of the amount sold (the seller gave up 10.01
 * PUSD), and the miner fee (10,901 sats there) must come from plain BCH in the wallet, since no BCH comes out of
 * the trade. Rounded up, so a sale of the whole balance never comes up short.
 */
export function routerFeeTokens(amount: bigint): bigint {
  return (amount + ROUTER_FEE_DIVISOR - 1n) / ROUTER_FEE_DIVISOR
}

/** The most of a token balance that can be sold for another token, leaving room for the fee on top. */
export function sellableForTokenSwap(balance: bigint): bigint {
  if (balance <= 0n) return 0n
  const amount = (balance * ROUTER_FEE_DIVISOR) / (ROUTER_FEE_DIVISOR + 1n)
  return amount + routerFeeTokens(amount) <= balance ? amount : amount - 1n
}

/**
 * Plain BCH a token-for-token trade needs in the wallet: the miner fee, plus the 1,000 sats each of the two token
 * outputs (what is bought, and the token change) carries, which a token coin's own sats may not cover. A margin of
 * 10% covers the miner-fee estimate (it ran 2.5% low on the measured build).
 */
export function bchForTokenSwap(pools: number): bigint {
  const miner = minerFeeSats(pools)
  return miner + miner / 10n + 2n * TOKEN_OUTPUT_SATS
}
