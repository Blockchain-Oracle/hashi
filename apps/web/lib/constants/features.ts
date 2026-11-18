/**
 * Swaps into PUSD or MUSD in one approval: the bridge pays a swap contract made for that swap, and Hashi trades the
 * BCH with the swap's own trade key (lib/engine/arrival.ts). Off: the bridge pays the person's wallet and the trade
 * is a second approval there, as before.
 */
export const SWAP_ON_ARRIVAL = true
