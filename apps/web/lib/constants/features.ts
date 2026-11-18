/**
 * Swaps into PUSD or MUSD in one approval: the bridge pays a swap contract made for that swap, and Hashi trades the
 * BCH with the swap's own trade key (lib/engine/arrival.ts). Off: the bridge pays the person's wallet and the trade
 * is a second approval there, as before.
 */
export const SWAP_ON_ARRIVAL = true

/**
 * Selling PUSD or MUSD through NEAR Intents in one approval: the Cauldron sale pays its BCH straight to NEAR's
 * deposit address, under a quote that takes a band of deposit amounts (FLEX_INPUT). Off: the sale pays the wallet
 * and a second approval sends the BCH on. THORChain sales always take two (its deposit needs its own memo).
 */
export const ONE_APPROVAL_SALE = true
