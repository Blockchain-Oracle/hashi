import { BCH_ASSETS, type BchAssetId, STABLES, type StableAsset } from '@/lib/constants/assets'
import { DEFAULT_SLIPPAGE_BPS } from '@/lib/constants/limits'
import type { Direction, RouteVia } from '@/lib/engine/types'

/**
 * The swap card's state. One side may be a stablecoin on another chain (bridged through NEAR Intents or THORChain),
 * or both sides may be on Bitcoin Cash (PUSD, MUSD, BCH, traded on Cauldron alone). A pick always stays where the
 * person put it; only a pair Hashi cannot carry (a stablecoin on both sides) changes the other side, and then the
 * card says so (`notice`). Picking the asset already on the other side swaps the two.
 */

export interface SwapState {
  direction: Direction
  /** The stablecoin side of a bridged pair; remembered while the pair stays on Bitcoin Cash. */
  stable: StableAsset
  /** Bridged: the Bitcoin Cash side. Local: what the person receives. */
  bchAsset: BchAssetId
  /** Local: what the person pays. Otherwise remembered for the next local pair. */
  bchFrom: BchAssetId
  /** What the person typed, in the paying asset. */
  amount: string
  slippageBps: number
  /** A custom destination; empty means the connected wallet. */
  recipient: string
  /** The route the person picked; null follows the best return. */
  provider: RouteVia | null
  /**
   * Into Bitcoin Cash: pay from a connected wallet, or send it yourself from an exchange or any wallet (NEAR
   * Intents only; Hashi shows where to send and watches for it).
   */
  payBy: 'wallet' | 'send'
  /** Sending it yourself: where a refund goes, an address of the person's own on the paying chain. */
  refundTo: string
  /** Out of Bitcoin Cash: the stablecoin lands in a connected wallet, or at an address typed in (`recipient`). */
  receiveBy: 'wallet' | 'address'
  /** Why the other side just changed, shown on the card until the next change. */
  notice: string | null
}

export type PickedAsset = { kind: 'stable'; stable: StableAsset } | { kind: 'bch'; id: BchAssetId }
export type Side = 'pay' | 'receive'

export type SwapAction =
  | { type: 'amount'; value: string }
  | { type: 'pick'; side: Side; asset: PickedAsset }
  | { type: 'flip'; amount: string }
  | { type: 'slippage'; bps: number }
  | { type: 'recipient'; value: string }
  | { type: 'route'; provider: RouteVia | null }
  | { type: 'payBy'; value: 'wallet' | 'send' }
  | { type: 'refundTo'; value: string }
  | { type: 'receiveBy'; value: 'wallet' | 'address' }

const DEFAULT_STABLE = STABLES[0] as StableAsset

export const INITIAL_STATE: SwapState = {
  direction: 'in',
  stable: DEFAULT_STABLE,
  bchAsset: 'PUSD',
  bchFrom: 'BCH',
  amount: '',
  slippageBps: DEFAULT_SLIPPAGE_BPS,
  recipient: '',
  provider: null,
  payBy: 'wallet',
  refundTo: '',
  receiveBy: 'wallet',
  notice: null,
}

/** What is on each side right now. */
export function sidesOf(state: SwapState): { pay: PickedAsset; receive: PickedAsset } {
  const stable: PickedAsset = { kind: 'stable', stable: state.stable }
  const bch: PickedAsset = { kind: 'bch', id: state.bchAsset }
  switch (state.direction) {
    case 'in':
      return { pay: stable, receive: bch }
    case 'out':
      return { pay: bch, receive: stable }
    case 'local':
      return { pay: { kind: 'bch', id: state.bchFrom }, receive: bch }
  }
}

/** The state for a pay and receive asset (never two stablecoins: the pick resolves that first). */
function withSides(state: SwapState, pay: PickedAsset, receive: PickedAsset): SwapState {
  if (pay.kind === 'stable' && receive.kind === 'bch') {
    return { ...state, direction: 'in', stable: pay.stable, bchAsset: receive.id }
  }
  if (pay.kind === 'bch' && receive.kind === 'stable') {
    return { ...state, direction: 'out', stable: receive.stable, bchAsset: pay.id }
  }
  if (pay.kind === 'bch' && receive.kind === 'bch') {
    return { ...state, direction: 'local', bchFrom: pay.id, bchAsset: receive.id }
  }
  return state
}

function sameAsset(a: PickedAsset, b: PickedAsset) {
  if (a.kind === 'stable' && b.kind === 'stable') return a.stable === b.stable
  if (a.kind === 'bch' && b.kind === 'bch') return a.id === b.id
  return false
}

/** An amount typed in one dollar asset still means the same in another; BCH does not. */
function dollarLike(asset: PickedAsset) {
  return asset.kind === 'stable' || asset.id !== 'BCH'
}

/** The Bitcoin Cash asset a stablecoin-only pick puts on the other side: the one last on screen. */
function fallbackBch(state: SwapState): BchAssetId {
  return state.bchAsset
}

export function swapReducer(state: SwapState, action: SwapAction): SwapState {
  switch (action.type) {
    case 'amount':
      return { ...state, amount: cleanAmount(action.value), notice: null }
    case 'slippage':
      return { ...state, slippageBps: action.bps }
    case 'recipient':
      return { ...state, recipient: action.value }
    case 'route':
      return { ...state, provider: action.provider }
    case 'payBy':
      return { ...state, payBy: action.value }
    case 'refundTo':
      return { ...state, refundTo: action.value }
    case 'receiveBy':
      // Back to the wallet: an address typed earlier no longer applies.
      return { ...state, receiveBy: action.value, ...(action.value === 'wallet' ? { recipient: '' } : {}) }
    case 'flip': {
      const { pay, receive } = sidesOf(state)
      return {
        ...withSides(state, receive, pay),
        amount: action.amount,
        recipient: '',
        provider: null,
        notice: null,
      }
    }
    case 'pick': {
      const { side, asset } = action
      const { pay, receive } = sidesOf(state)
      const other = side === 'pay' ? receive : pay
      let nextPay = pay
      let nextReceive = receive
      let notice: string | null = null

      if (sameAsset(asset, other)) {
        // The asset already on the other side: the two swap places.
        nextPay = receive
        nextReceive = pay
      } else {
        if (side === 'pay') nextPay = asset
        else nextReceive = asset
        if (asset.kind === 'stable' && other.kind === 'stable') {
          // Stablecoin to stablecoin is not a Hashi route: keep the pick, put Bitcoin Cash on the other side.
          const fallback: PickedAsset = { kind: 'bch', id: fallbackBch(state) }
          if (side === 'pay') nextReceive = fallback
          else nextPay = fallback
          notice = `${side === 'pay' ? 'You receive' : 'You pay'} is now ${fallback.id}: one side of a Hashi swap is always on Bitcoin Cash.`
        }
      }

      const next = withSides(state, nextPay, nextReceive)
      const payChanged = !sameAsset(nextPay, pay)
      const keepAmount = !payChanged || (dollarLike(pay) && dollarLike(nextPay))
      return {
        ...next,
        amount: keepAmount ? state.amount : '',
        recipient: next.direction === state.direction ? state.recipient : '',
        provider: null,
        notice,
      }
    }
  }
}

/** Digits and one decimal point; a leading "." becomes "0.". */
export function cleanAmount(text: string): string {
  const normalized = text.replace(',', '.').replace(/[^0-9.]/g, '')
  const [whole = '', ...rest] = normalized.split('.')
  const value = rest.length ? `${whole}.${rest.join('')}` : whole
  return value.startsWith('.') ? `0${value}` : value
}

export function stableId(stable: Pick<StableAsset, 'symbol' | 'chain'>) {
  return `${stable.symbol}.${stable.chain}`
}

function findStable(id: string | null): StableAsset | undefined {
  return id ? STABLES.find((s) => stableId(s) === id) : undefined
}

function isBchAsset(id: string | null): id is BchAssetId {
  return id !== null && id in BCH_ASSETS
}

/**
 * Reads `?from=USDC.base&to=PUSD&amount=25`, the reverse, or a Bitcoin Cash pair (`?from=PUSD&to=MUSD`); anything
 * unknown falls back to the default.
 */
export function stateFromParams(params: URLSearchParams): SwapState {
  const from = params.get('from')
  const to = params.get('to')
  const amount = cleanAmount(params.get('amount') ?? '')
  const fromStable = findStable(from)
  const toStable = findStable(to)
  if (fromStable && isBchAsset(to)) {
    return { ...INITIAL_STATE, direction: 'in', stable: fromStable, bchAsset: to, amount }
  }
  if (isBchAsset(from) && toStable) {
    return { ...INITIAL_STATE, direction: 'out', stable: toStable, bchAsset: from, amount }
  }
  if (isBchAsset(from) && isBchAsset(to) && from !== to) {
    return { ...INITIAL_STATE, direction: 'local', bchFrom: from, bchAsset: to, amount }
  }
  return { ...INITIAL_STATE, amount }
}

export function paramsFromState(state: SwapState): string {
  const stable = stableId(state.stable)
  const params = new URLSearchParams(
    state.direction === 'in'
      ? { from: stable, to: state.bchAsset }
      : state.direction === 'out'
        ? { from: state.bchAsset, to: stable }
        : { from: state.bchFrom, to: state.bchAsset },
  )
  if (state.amount) params.set('amount', state.amount)
  return params.toString()
}
