/**
 * Network fees a person pays on top of what the providers quote. Gas per stablecoin lives on its row in ./assets.ts;
 * gas prices, rent and coin prices are read live.
 */

/**
 * THORChain router `depositWithExpiry` (selector 0x44bc937b) with an ERC-20: four real Ethereum deposits used
 * 66,033–70,797 gas (Midgard swaps of ETH.USDC, receipts read 2026-11-16). The highest, rounded up.
 */
export const THORCHAIN_DEPOSIT_GAS = 71_000n

/** Solana charges 5,000 lamports per signature; a token transfer has one. */
export const SOLANA_SIGNATURE_LAMPORTS = 5_000n

/**
 * A fresh deposit address has no token account yet, so the sender creates one and funds its rent. An SPL token
 * account is 165 bytes; its rent-exempt minimum is read live (`getMinimumBalanceForRentExemption`).
 */
export const SPL_TOKEN_ACCOUNT_BYTES = 165

/** A plain Bitcoin Cash send (one or two inputs, two outputs) at 1 sat/byte, with headroom. */
export const BCH_SEND_FEE_SATS = 300n
