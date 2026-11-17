import { z } from 'zod'
import { BCH_ASSETS, type BchAssetId } from '@/lib/constants/assets'
import { ROUTER_KEEPALIVE_MS } from '@/lib/constants/limits'
import { CAULDRON_ROUTER_URL } from '@/lib/constants/providers'
import { ProviderError } from '@/lib/http'

/**
 * Cauldron Router (https://docs.riftenlabs.com/router): Electrum-style JSON-RPC over one WebSocket. It finds the
 * best path through Cauldron's pools and builds the unsigned transaction; the wallet signs, Hashi broadcasts.
 *
 * Measured on 2026-11-16 (research: bridge-bch-leg-and-wallets.md §1):
 * - quotes leave out the Router's 0.1% fee and the miner fee (~1 sat/byte); a build adds both;
 * - idle sockets are dropped after ~110–250 s, but a quote every 10 s kept them open;
 * - a build subscription pushes a fresh `tx.update` 3–5 s after any trade that touches its pools.
 */

const PROVIDER = 'Cauldron'

/** `"bch"` or a token category. */
export type RouterAsset = 'bch' | string

export function routerAsset(id: BchAssetId): RouterAsset {
  return BCH_ASSETS[id].category ?? 'bch'
}

export interface RouteQuoteParams {
  sell: RouterAsset
  buy: RouterAsset
  /** Base units of the side `side` fixes. */
  amount: bigint
  side: 'sell' | 'buy'
}

const quoteSchema = z.looseObject({
  kind: z.string(),
  pools: z.number(),
  input_amount: z.string().optional(),
  output_amount: z.string().optional(),
  input_is_bch: z.boolean().optional(),
  output_is_bch: z.boolean().optional(),
  market_pre_price: z.string().optional(),
  market_post_price: z.string().optional(),
  token_a_in: z.string().optional(),
  token_b_out: z.string().optional(),
  fill: z.object({ filled: z.string(), requested: z.string(), side: z.string() }).optional(),
})
export type RouteQuote = z.infer<typeof quoteSchema>

export interface FundingUtxo {
  txid: string
  vout: number
  value: bigint
  scriptHex: string
  token?: { category: string; amount: bigint }
}

export interface BuildParams extends RouteQuoteParams {
  funding: FundingUtxo[]
  /** Where bought tokens (and token change) go: the token-aware `z…` address, with `bitcoincash:`. */
  receiveAddress: string
  /** Where BCH change and token→BCH proceeds go, with `bitcoincash:`. */
  changeAddress: string
  /** Slippage floor on the bought amount (sell side only). */
  minOutput?: bigint
}

const sourceOutputSchema = z.object({
  value: z.string(),
  locking_script_hex: z.string(),
  token: z.object({ category: z.string(), amount: z.string() }).optional(),
})

const buildSchema = z.looseObject({
  unsigned_tx_hex: z.string(),
  source_outputs: z.array(sourceOutputSchema),
  inputs_to_sign: z.array(z.number()),
  expected_output: z.string(),
  fee_sats: z.string(),
  fee_token_amount: z.string(),
  miner_fee_sats: z.string(),
  route: quoteSchema,
})
export type RouterBuild = z.infer<typeof buildSchema>

export class RouterError extends ProviderError {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(PROVIDER, message)
    this.name = 'RouterError'
  }
}

/**
 * What the Router says a trade would give when it refuses to build it under `min_output` (error code `slippage`,
 * "user receives 198441, below min_output 999999999", seen live). Undefined for any other error.
 */
export function offeredBelowFloor(error: unknown): bigint | undefined {
  if (!(error instanceof RouterError) || error.code !== 'slippage') return undefined
  const offered = /receives (\d+)/.exec(error.message)?.[1]
  return offered ? BigInt(offered) : undefined
}

function toWire(params: RouteQuoteParams) {
  return { sell: params.sell, buy: params.buy, amount: params.amount.toString(), side: params.side }
}

function buildToWire(params: BuildParams) {
  return {
    ...toWire(params),
    funding: params.funding.map((u) => ({
      txid: u.txid,
      vout: u.vout,
      value: u.value.toString(),
      script_hex: u.scriptHex,
      ...(u.token ? { token: { category: u.token.category, amount: u.token.amount.toString() } } : {}),
    })),
    receive_addr: params.receiveAddress,
    change_addr: params.changeAddress,
    ...(params.minOutput === undefined ? {} : { min_output: params.minOutput.toString() }),
    signing_mode: 'wizardconnect',
  }
}

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type BuildUpdate = { build: RouterBuild } | { error: RouterError }

/** A cheap quote that keeps the socket warm (buy 0.01 PUSD). */
const KEEPALIVE_QUOTE: RouteQuoteParams = { sell: 'bch', buy: routerAsset('PUSD'), amount: 1n, side: 'buy' }
const REQUEST_TIMEOUT_MS = 20_000
const IDLE_CLOSE_MS = 60_000
const MAX_BACKOFF_MS = 15_000

class RouterClient {
  private socket: WebSocket | undefined
  private opening: Promise<WebSocket> | undefined
  private nextId = 1
  private readonly pending = new Map<number, Pending>()
  private subscription: { params: BuildParams; onUpdate: (update: BuildUpdate) => void } | undefined
  private keepAlive: ReturnType<typeof setInterval> | undefined
  private lastActivity = 0
  private attempts = 0

  constructor(private readonly url: string) {}

  quote(params: RouteQuoteParams) {
    return this.request('route.quote', toWire(params), quoteSchema)
  }

  build(params: BuildParams) {
    return this.request('tx.build', buildToWire(params), buildSchema)
  }

  /**
   * Keep a build fresh: the Router re-assembles it whenever a trade changes its pools. One build subscription per
   * connection; a new one replaces the old. Returns the unsubscribe function.
   */
  subscribeBuild(params: BuildParams, onUpdate: (update: BuildUpdate) => void): () => void {
    this.subscription = { params, onUpdate }
    void this.sendSubscription()
    return () => {
      if (this.subscription?.params !== params) return
      this.subscription = undefined
      if (this.socket?.readyState === WebSocket.OPEN)
        void this.request('tx.unsubscribe', {}, z.unknown()).catch(() => {})
    }
  }

  private async sendSubscription() {
    const sub = this.subscription
    if (!sub) return
    try {
      const build = await this.request('tx.subscribe', buildToWire(sub.params), buildSchema)
      if (this.subscription === sub) sub.onUpdate({ build })
    } catch (error) {
      if (this.subscription === sub && error instanceof RouterError) sub.onUpdate({ error })
    }
  }

  private async request<T extends z.ZodType>(
    method: string,
    params: unknown,
    schema: T,
  ): Promise<z.infer<T>> {
    const socket = await this.open()
    const id = this.nextId++
    this.lastActivity = Date.now()
    const raw = await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new ProviderError(PROVIDER, `${PROVIDER} did not answer ${method} in time`))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
    const parsed = schema.safeParse(raw)
    if (!parsed.success)
      throw new ProviderError(PROVIDER, `${PROVIDER} sent an unexpected ${method} result`, undefined, raw)
    return parsed.data
  }

  private open(): Promise<WebSocket> {
    if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve(this.socket)
    if (this.opening) return this.opening
    this.opening = new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.url)
      socket.onopen = () => {
        this.socket = socket
        this.opening = undefined
        this.attempts = 0
        this.startKeepAlive()
        resolve(socket)
      }
      socket.onmessage = (event) => this.onMessage(String(event.data))
      socket.onerror = () => {
        if (this.opening) {
          this.opening = undefined
          reject(new ProviderError(PROVIDER, `Could not reach ${PROVIDER}`))
        }
      }
      socket.onclose = () => this.onClose(socket)
    })
    return this.opening
  }

  private onMessage(data: string) {
    let message: {
      id?: number | null
      result?: unknown
      error?: { code: string; message: string }
      method?: string
      params?: unknown
    }
    try {
      message = JSON.parse(data)
    } catch {
      return
    }
    if (typeof message.id === 'number') {
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.error) pending.reject(new RouterError(message.error.code, message.error.message))
      else pending.resolve(message.result)
      return
    }
    if (message.method === 'tx.update' && this.subscription) {
      const params = message.params as { error?: { code: string; message: string } } | undefined
      if (params?.error) {
        this.subscription.onUpdate({ error: new RouterError(params.error.code, params.error.message) })
        return
      }
      const parsed = buildSchema.safeParse(message.params)
      if (parsed.success) this.subscription.onUpdate({ build: parsed.data })
    }
  }

  private onClose(socket: WebSocket) {
    if (this.socket === socket) this.socket = undefined
    this.stopKeepAlive()
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new ProviderError(PROVIDER, `${PROVIDER} connection closed`))
      this.pending.delete(id)
    }
    // Only a live subscription is worth reconnecting for; plain requests reopen the socket on demand.
    if (this.subscription) {
      const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.attempts++)
      setTimeout(() => void this.sendSubscription(), delay)
    }
  }

  private startKeepAlive() {
    this.stopKeepAlive()
    this.keepAlive = setInterval(() => {
      if (this.subscription) {
        void this.quote(KEEPALIVE_QUOTE).catch(() => {})
      } else if (Date.now() - this.lastActivity > IDLE_CLOSE_MS) {
        this.socket?.close()
      }
    }, ROUTER_KEEPALIVE_MS)
  }

  private stopKeepAlive() {
    if (this.keepAlive) clearInterval(this.keepAlive)
    this.keepAlive = undefined
  }
}

let client: RouterClient | undefined

/** One Router connection per tab, opened on first use. Browser only. */
export function getRouter(): RouterClient {
  client ??= new RouterClient(CAULDRON_ROUTER_URL)
  return client
}
