/**
 * Where Hashi talks to each provider. Every endpoint answers the browser directly (NEAR Intents and THORChain send
 * `access-control-allow-origin: *`; the router and Electrum are WebSockets), so there is no proxy of our own.
 */

/** NEAR Intents 1Click API: tokens, quotes, deposit status. https://docs.near-intents.org */
export const NEAR_ONE_CLICK_URL = 'https://1click.chaindefuser.com'

/** THORChain node API through Liquify's public gateway: quotes, pools, inbound addresses, halts, tx stages. */
export const THORCHAIN_API_URL = 'https://gateway.liquify.com/chain/thorchain_api/thorchain'

/** Cauldron Router (JSON-RPC over WebSocket): `route.quote`, `tx.build`, `tx.subscribe`. https://docs.riftenlabs.com */
export const CAULDRON_ROUTER_URL = 'wss://router.riften.net/v1/route'

/** Cauldron's pool indexer: live pools and liquidity per token. */
export const CAULDRON_INDEXER_URL = 'https://indexer.riften.net'

/**
 * Fulcrum servers that answered over secure WebSocket on 2026-11-16. Hashi reads balances and UTXOs here, follows
 * addresses, and broadcasts BCH transactions (Cauldron's own broadcast endpoint failed TLS that day).
 */
export const ELECTRUM_SERVERS = [
  'bch.imaginary.cash',
  'electrum.imaginary.cash',
  'cashnode.bch.ninja',
  'fulcrum.greyh.at',
  'bch.loping.net',
] as const

export const ELECTRUM_WSS_PORT = 50004

/**
 * Reown's blockchain API: the JSON-RPC endpoint AppKit itself uses, keyed by the same project id. Hashi reads Solana
 * balances and rent through it (checked live on 2026-11-16: `getTokenAccountsByOwner`, `getBalance`).
 */
export const REOWN_RPC_URL = 'https://rpc.walletconnect.org/v1/'

/** Solana mainnet, as a CAIP-2 chain id. */
export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
