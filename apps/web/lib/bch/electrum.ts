import { ElectrumClient, type ElectrumClientEvents, type RPCNotification } from '@electrum-cash/network'
import { ELECTRUM_SERVERS } from '@/lib/constants/providers'

/**
 * Bitcoin Cash over Electrum (Fulcrum servers, protocol 1.5): balances and UTXOs with their CashTokens, live
 * address and block updates, and broadcasting. Servers are tried in turn; a dead one is skipped for the next.
 */

const APPLICATION = 'Hashi'
const PROTOCOL = '1.5'
const CONNECT_TIMEOUT_MS = 8_000

export interface Utxo {
  txid: string
  vout: number
  value: bigint
  /** 0 while unconfirmed. */
  height: number
  token?: { category: string; amount: bigint }
}

let client: ElectrumClient<ElectrumClientEvents> | undefined
let connecting: Promise<ElectrumClient<ElectrumClientEvents>> | undefined
let serverIndex = 0
const listeners = new Map<string, Set<(params: unknown[]) => void>>()

function onNotification(notification: RPCNotification) {
  const params = (notification.params ?? []) as unknown[]
  const key =
    notification.method === 'blockchain.address.subscribe' ? `address:${params[0]}` : notification.method
  for (const listener of listeners.get(key) ?? []) listener(params)
}

async function connectTo(host: string) {
  const candidate = new ElectrumClient<ElectrumClientEvents>(APPLICATION, PROTOCOL, host)
  await Promise.race([
    candidate.connect(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${host} did not answer`)), CONNECT_TIMEOUT_MS),
    ),
  ])
  candidate.on('notification', onNotification)
  return candidate
}

/** The connected client, connecting (and failing over) on first use. Browser only. */
export function getElectrum(): Promise<ElectrumClient<ElectrumClientEvents>> {
  if (client) return Promise.resolve(client)
  connecting ??= (async () => {
    let lastError: unknown
    for (let tries = 0; tries < ELECTRUM_SERVERS.length; tries++) {
      const host = ELECTRUM_SERVERS[serverIndex % ELECTRUM_SERVERS.length] as string
      try {
        client = await connectTo(host)
        return client
      } catch (error) {
        lastError = error
        serverIndex++
      }
    }
    throw lastError instanceof Error ? lastError : new Error('No Electrum server answered')
  })().finally(() => {
    connecting = undefined
  })
  return connecting
}

export function electrumHost() {
  return client?.hostIdentifier
}

async function request<T>(method: string, ...params: (string | number | boolean)[]): Promise<T> {
  const electrum = await getElectrum()
  const result = await electrum.request(method, ...params)
  if (result instanceof Error) throw result
  return result as T
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

/** Sends a signed transaction to the network. Returns its id. */
export function broadcast(rawTxHex: string): Promise<string> {
  return request<string>('blockchain.transaction.broadcast', rawTxHex)
}

/** The chain tip, kept current by a headers subscription the client holds once asked. */
export async function getTipHeight(): Promise<number> {
  const electrum = await getElectrum()
  if (!electrum.chainHeight) await electrum.subscribe('blockchain.headers.subscribe')
  return electrum.chainHeight
}

/** Calls `onChange` whenever the address's history changes (a payment arrives or leaves). */
export async function subscribeAddress(address: string, onChange: () => void): Promise<() => void> {
  const key = `address:${address}`
  const set = listeners.get(key) ?? new Set()
  listeners.set(key, set)
  const listener = () => onChange()
  set.add(listener)
  const electrum = await getElectrum()
  await electrum.subscribe('blockchain.address.subscribe', address)
  return () => {
    set.delete(listener)
    if (set.size === 0) {
      listeners.delete(key)
      void electrum.unsubscribe('blockchain.address.subscribe', address).catch(() => {})
    }
  }
}
