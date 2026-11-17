/** Timings for live data. Quotes move with prices, so they refresh often; lists and halts change slowly. */

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

/** A quote counts as fresh this long, and every route refetches on this interval while the swap card is open. */
export const QUOTE_STALE_MS = 10 * SECOND
export const QUOTE_REFETCH_MS = 15 * SECOND

/** Wait this long after the last keystroke before asking for quotes. */
export const AMOUNT_DEBOUNCE_MS = 300

/** NEAR Intents' token list changes rarely. */
export const TOKEN_LIST_STALE_MS = HOUR

/** Coin prices (from the same list) and gas prices move faster: re-read them every minute and every 30 s. */
export const PRICE_STALE_MS = MINUTE
export const GAS_PRICE_STALE_MS = 30 * SECOND

/** Wallet balances are re-read on this interval while the swap card is open. */
export const BALANCE_REFETCH_MS = 30 * SECOND

/** THORChain halts (per chain and per pool) are re-read this often. */
export const PROVIDER_STATUS_STALE_MS = 30 * SECOND

/** A swap in progress polls its provider's status on this interval until it reaches an end state. */
export const STATUS_POLL_MS = 5 * SECOND

/** The router closes idle sockets after a few minutes; a cheap quote on this interval keeps ours open. */
export const ROUTER_KEEPALIVE_MS = 10 * SECOND

/** Slippage Hashi asks for unless the person sets their own (100 = 1%). */
export const DEFAULT_SLIPPAGE_BPS = 100

/**
 * How long a NEAR deposit address waits before refunding. 1Click: the deadline "must exceed the time required for
 * the deposit transaction to be mined": 1 hour, and 4 hours when the deposit is on a UTXO chain (a Bitcoin Cash block
 * can take 20 minutes or more).
 */
export const NEAR_DEADLINE_MS = HOUR
export const NEAR_UTXO_DEADLINE_MS = 4 * HOUR

/**
 * A swap whose first step is a Cauldron trade (on Bitcoin Cash, or selling PUSD or MUSD) has no bridge deadline: it
 * is priced again when built. Left unstarted this long, it ends as expired, like a bridge quote that ran out.
 */
export const CAULDRON_QUOTE_TTL_MS = HOUR

/** Bitcoin Cash targets one block every 10 minutes. How many confirmations NEAR waits for is measured in T1. */
export const BCH_BLOCK_SECONDS = 600

/** Seeing the bridged BCH, building the Cauldron trade and broadcasting it (the wallet's own approval aside). */
export const CAULDRON_LEG_SECONDS = 15
