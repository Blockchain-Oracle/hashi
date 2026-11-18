import {
  ConnectionStatus,
  ElectrumClient,
  type ElectrumClientEvents,
  type RPCNotification,
} from '@electrum-cash/network'
import { ELECTRUM_SERVERS } from '@/lib/constants/providers'

/**
 * Bitcoin Cash over Electrum (Fulcrum servers, protocol 1.5): balances and UTXOs with their CashTokens, live
 * address and block updates, and broadcasting. Servers are tried in turn. A server that drops the connection is
 * left for the next one at once (the library would keep retrying the same server, and every request in the
 * meantime would fail), and a request the drop interrupted is sent again there. Address subscriptions move along.
 */

const APPLICATION = 'Hashi'
const PROTOCOL = '1.5'
const CONNECT_TIMEOUT_MS = 8_000
/** How long one request may take before its server counts as gone (a broadcast included). */
const REQUEST_TIMEOUT_MS = 20_000
/** Servers tried per request: the current one and up to two others. */
const REQUEST_ATTEMPTS = 3

type Client = ElectrumClient<ElectrumClientEvents>

export interface Utxo {
  txid: string
  vout: number
  value: bigint
  /** 0 while unconfirmed. */
  height: number
  token?: { category: string; amount: bigint }
}

let client: Client | undefined
let connecting: Promise<Client> | undefined
let serverIndex = 0
/** A server dropped since the last connection: subscriptions must move to the next one. */
let failedOver = false
const listeners = new Map<string, Set<(params: unknown[]) => void>>()
const ADDRESS_KEY = 'address:'

/** The connection itself failed (as opposed to the server answering with an error): worth another server. */
class ConnectionLost extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectionLost'
  }
}

// What the library says when a request meets a dropped connection: thrown before sending, or the answer of a
// request that was waiting when the connection dropped.
const DROPPED = /disconnected server|connection lost/i
const isConnectionLost = (error: unknown) =>
  error instanceof ConnectionLost || (error instanceof Error && DROPPED.test(error.message))
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

function onNotification(notification: RPCNotification) {
  const params = (notification.params ?? []) as unknown[]
  const key =
    notification.method === 'blockchain.address.subscribe'
      ? `${ADDRESS_KEY}${params[0]}`
      : notification.method
  for (const listener of listeners.get(key) ?? []) listener(params)
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ConnectionLost(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function connectTo(host: string) {
  const candidate: Client = new ElectrumClient<ElectrumClientEvents>(APPLICATION, PROTOCOL, host)
  try {
    await withTimeout(candidate.connect(), CONNECT_TIMEOUT_MS, `${host} did not answer`)
  } catch (error) {
    void candidate.disconnect(true).catch(() => {})
    throw error
  }
  candidate.on('notification', onNotification)
  return candidate
}

/**
 * Address subscriptions held on a server that went away, made again on the new one. Each listener is also told
 * once, since a payment may have landed while there was no connection.
 */
function moveSubscriptions(to: Client) {
  for (const [key, set] of listeners) {
    if (!key.startsWith(ADDRESS_KEY)) continue
    const address = key.slice(ADDRESS_KEY.length)
    void to.subscribe('blockchain.address.subscribe', address).catch(() => {})
    for (const listener of set) listener([address])
  }
}

/** The connected client, connecting (and failing over) on first use. Browser only. */
export function getElectrum(): Promise<Client> {
  if (client) return Promise.resolve(client)
  connecting ??= (async () => {
    let lastError: unknown
    for (let tries = 0; tries < ELECTRUM_SERVERS.length; tries++) {
      const host = ELECTRUM_SERVERS[serverIndex % ELECTRUM_SERVERS.length] as string
      try {
        const fresh = await connectTo(host)
        client = fresh
        if (failedOver) {
          failedOver = false
          moveSubscriptions(fresh)
        }
        return fresh
      } catch (error) {
        lastError = error
        serverIndex++
      }
    }
    throw new Error(
      `Hashi could not reach the Bitcoin Cash network just now (${messageOf(lastError)}). Try again in a moment.`,
    )
  })().finally(() => {
    connecting = undefined
  })
  return connecting
}

/** Leaves a server whose connection dropped, so the next call connects to the next server. */
function dropClient(stale: Client) {
  if (client !== stale) return
  client = undefined
  serverIndex++
  failedOver = true
  void stale.disconnect(true).catch(() => {})
}

/** A client that is connected right now: a cached one whose connection dropped is replaced, never waited on. */
async function liveClient(): Promise<Client> {
  if (client && client.status !== ConnectionStatus.CONNECTED) dropClient(client)
  return getElectrum()
}

export function electrumHost() {
  return client?.hostIdentifier
}

async function request<T>(method: string, ...params: (string | number | boolean)[]): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < REQUEST_ATTEMPTS; attempt++) {
    const electrum = await liveClient()
    try {
      const result = await withTimeout(
        electrum.request(method, ...params),
        REQUEST_TIMEOUT_MS,
        `${electrum.hostIdentifier} did not answer in time`,
      )
      if (result instanceof Error) throw result
      return result as T
    } catch (error) {
      // The server's own answer (a rejected transaction, an unknown address) is final; a lost connection is not.
      if (!isConnectionLost(error)) throw error
      lastError = error
      dropClient(electrum)
    }
  }
  throw new Error(
    `Hashi could not reach the Bitcoin Cash network just now (${messageOf(lastError)}). Try again in a moment.`,
  )
}

interface RawUtxo {
  tx_hash: string
  tx_pos: number
  value: number
  height: number
  token_data?: { category: string; amount: string }
}

/** Every unspent output at an address, with its tokens. */
export async function listUnspent(address: string): Promise<Utxo[]> {
  const raw = await request<RawUtxo[]>('blockchain.address.listunspent', address, 'include_tokens')
  return raw.map((u) => ({
    txid: u.tx_hash,
    vout: u.tx_pos,
    value: BigInt(u.value),
    height: u.height,
    ...(u.token_data
      ? { token: { category: u.token_data.category, amount: BigInt(u.token_data.amount) } }
      : {}),
  }))
}

/** How many transactions have touched an address (0 = never used). */
export async function historyLength(address: string): Promise<number> {
  const history = await request<unknown[]>('blockchain.address.get_history', address)
  return history.length
}

/** Every transaction that touched an address, oldest first (height 0 or below: still in the mempool). */
export async function addressHistory(address: string): Promise<{ txid: string; height: number }[]> {
  const history = await request<{ tx_hash: string; height: number }[]>(
    'blockchain.address.get_history',
    address,
  )
  return history.map((h) => ({ txid: h.tx_hash, height: h.height }))
}

/** A transaction's raw hex. */
export function rawTransaction(txid: string): Promise<string> {
  return request<string>('blockchain.transaction.get', txid)
}

/** What a node says about a transaction it already has: this exact transaction went out before. */
const ALREADY_SENT = /txn-already-(known|in-mempool)|transaction already in (the )?block ?chain/i

/**
 * Sends a signed transaction to the network. Returns its id. A broadcast sent again after a lost connection may
 * find that the first try went through; the node then says it already has the transaction, which is a success.
 */
export async function broadcast(rawTxHex: string): Promise<string> {
  try {
    return await request<string>('blockchain.transaction.broadcast', rawTxHex)
  } catch (error) {
    if (!(error instanceof Error && ALREADY_SENT.test(error.message))) throw error
    const { binToHex, hash256, hexToBin } = await import('@bitauth/libauth')
    return binToHex(hash256(hexToBin(rawTxHex)).reverse())
  }
}

/** The chain tip, kept current by a headers subscription the client holds once asked. */
export async function getTipHeight(): Promise<number> {
  const electrum = await liveClient()
  if (!electrum.chainHeight) await electrum.subscribe('blockchain.headers.subscribe')
  return electrum.chainHeight
}

/** Calls `onChange` whenever the address's history changes (a payment arrives or leaves). */
export async function subscribeAddress(address: string, onChange: () => void): Promise<() => void> {
  const key = `${ADDRESS_KEY}${address}`
  const set = listeners.get(key) ?? new Set()
  listeners.set(key, set)
  const listener = () => onChange()
  set.add(listener)
  const electrum = await liveClient()
  await electrum.subscribe('blockchain.address.subscribe', address)
  return () => {
    set.delete(listener)
    if (set.size === 0) {
      listeners.delete(key)
      // Whichever server holds the subscription now (it moves with a failover).
      if (client) void client.unsubscribe('blockchain.address.subscribe', address).catch(() => {})
    }
  }
}

/** A block header's time (seconds): bytes 68–71, little-endian. */
function headerTime(hex: string): number {
  const bytes = hex.slice(136, 144).match(/../g) ?? []
  return Number.parseInt(bytes.reverse().join(''), 16)
}

/** The chain tip: its height, and when its block was mined (ms). */
export async function getTip(): Promise<{ height: number; at: number }> {
  const tip = await request<{ height: number; hex: string }>('blockchain.headers.get_tip')
  return { height: tip.height, at: headerTime(tip.hex) * 1000 }
}

/** A transaction's block height: 0 while it waits in the mempool, undefined when the server does not know it. */
export async function transactionHeight(txid: string): Promise<number | undefined> {
  try {
    const height = await request<number>('blockchain.transaction.get_height', txid)
    return typeof height === 'number' ? Math.max(0, height) : undefined
  } catch (error) {
    // Only the server's own answer ("not found") means unknown; a lost connection is passed on.
    if (error instanceof Error && /could not reach/i.test(error.message)) throw error
    return undefined
  }
}

/** When the block at a height was mined (ms). */
export async function blockTime(height: number): Promise<number> {
  const hex = await request<string>('blockchain.block.header', height)
  return headerTime(hex) * 1000
}
