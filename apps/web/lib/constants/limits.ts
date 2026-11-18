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

/** How often the tracker reads the Bitcoin Cash tip and the deposit's block while a bridge waits for blocks. */
export const CHAIN_READ_MS = 15 * SECOND
/** Status checks failing this long (three in a row) is said on the tracker, not left to look like a slow bridge. */
export const STATUS_TROUBLE_MS = 15 * SECOND

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

/**
 * Swap-on-arrival contract: when the BCH may go back to the person if the trade cannot happen (an hour after the
 * quote). The chain's median time runs about an hour behind the clock, so in practice the refund opens ~2 h in.
 */
export const ARRIVAL_REFUND_DELAY_MS = HOUR
/** While the BCH is on its way to the contract: how often Hashi looks for it and tries the trade. */
export const ARRIVAL_RETRY_MS = 8 * SECOND
/** While prices sit under the contract's floor: how often Hashi asks Cauldron again (gentler on the Router). */
export const ARRIVAL_PRICE_RETRY_MS = 30 * SECOND
/** How often the tracker re-reads what the swap contract holds (for "Send the BCH to my wallet"). */
export const ARRIVAL_COINS_REFRESH_MS = 15 * SECOND
/** The keeper must have run within this long for the server to accept a new swap contract (it runs every 10 min). */
export const KEEPER_STALE_MS = 30 * MINUTE
/** One keeper run stops starting new work after this long; what is left waits for the next run. */
export const SWEEP_BUDGET_MS = 45 * SECOND
/** Contracts the server keeps at most; past it, new swaps pay the wallet instead (a guard against junk). */
export const ARRIVAL_STORE_MAX = 5_000
/** Pool conflicts (another trade took a pool first) are rebuilt this many times before giving up for a while. */
export const ARRIVAL_CONFLICT_RETRIES = 3
export const NEAR_UTXO_DEADLINE_MS = 4 * HOUR

/**
 * A swap whose first step is a Cauldron trade (on Bitcoin Cash, or selling PUSD or MUSD) has no bridge deadline: it
 * is priced again when built. Left unstarted this long, it ends as expired, like a bridge quote that ran out.
 */
export const CAULDRON_QUOTE_TTL_MS = HOUR

/** Bitcoin Cash targets one block every 10 minutes. */
export const BCH_BLOCK_SECONDS = 600

/**
 * Blocks NEAR Intents waits for before it takes a Bitcoin Cash deposit. Measured on a live sale (2026-11-18): still
 * PENDING_DEPOSIT 17 minutes into the first confirmation, PROCESSING 10 minutes after the second, USDC on Base 6
 * minutes later. NEAR does not publish the number.
 */
export const NEAR_BCH_CONFIRMATIONS = 2

/** Seeing the bridged BCH, building the Cauldron trade and broadcasting it (the wallet's own approval aside). */
export const CAULDRON_LEG_SECONDS = 15
