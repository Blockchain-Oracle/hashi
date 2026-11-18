'use client'

import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useDepositFees, usePrices } from '@/features/market/use-market'
import { useDebounced, useRouteQuote } from '@/features/routes/use-route-quotes'
import { useBchWallet } from '@/features/wallets/bch-wallet'
import { useEvmWallet } from '@/features/wallets/evm-wallet'
import { stableKey, useBalances } from '@/features/wallets/use-balances'
import { toTokenAddress } from '@/lib/bch/address'
import { CHAINS } from '@/lib/constants/chains'
import { BCH_SEND_FEE_SATS } from '@/lib/constants/fees'
import { bchForTokenSwap, sellableForTokenSwap } from '@/lib/engine/cauldron-fees'
import {
  costInReceiveUnits,
  payUnitUsd,
  type RouteCosts,
  receiveUnitUsd,
  routeCosts,
} from '@/lib/engine/costs'
import { pairSides } from '@/lib/engine/pair'
import { type OutsideCosts, rankRoutes } from '@/lib/engine/rank'
import type { Pair, QuoteRequest, Route, RouteOutcome, RouteVia, SwapAddresses } from '@/lib/engine/types'
import { minimumToShow } from '@/lib/format'
import { checkRecipient } from '@/lib/recipient'
import { INITIAL_STATE, paramsFromState, stateFromParams, swapReducer } from './state'
import { useRelay } from './use-relay'

const SLIPPAGE_KEY = 'hashi_slippage_bps'

function storedSlippage(): number | undefined {
  try {
    const value = Number(localStorage.getItem(SLIPPAGE_KEY))
    return Number.isInteger(value) && value > 0 && value <= 5000 ? value : undefined
  } catch {
    return undefined
  }
}

function toBase(text: string, decimals: number): bigint {
  try {
    return text ? parseUnits(text, decimals) : 0n
  } catch {
    return 0n
  }
}

/** What the big button does next; the first thing missing wins. */
export type SwapStep =
  | { kind: 'enter-amount' }
  | { kind: 'connect-stable'; namespace: 'eip155' | 'solana' }
  | { kind: 'connect-bch' }
  | { kind: 'fix-recipient'; message: string }
  | { kind: 'insufficient'; symbol: string }
  | { kind: 'insufficient-gas'; symbol: string; chain: string }
  /** PUSD ⇄ MUSD: the trade needs a little plain BCH for its network fee. */
  | { kind: 'needs-bch-fee'; sats: bigint }
  | { kind: 'finding' }
  /** Every route that could carry the pair wants more: the smallest of their minimums, as an amount to type. */
  | { kind: 'below-minimum'; amount: string; symbol: string }
  | { kind: 'no-route'; message: string }
  | { kind: 'review'; needsGasless?: boolean }

/**
 * Everything the swap card shows, derived from its state: every route that carries the pair priced live (each on
 * its own: the two bridges, or Cauldron alone when both sides are on Bitcoin Cash), ranked by what the person keeps
 * after gas, plus balances, dollar values and the next step. Quotes run before any wallet is connected (with
 * addresses nobody controls), so prices are visible from the first keystroke.
 */
export function useSwap(initialParams: URLSearchParams, { syncUrl = true }: { syncUrl?: boolean } = {}) {
  const [state, dispatch] = useReducer(swapReducer, initialParams, (params) => stateFromParams(params))
  const evm = useEvmWallet()
  const bch = useBchWallet()
  const balances = useBalances()
  const prices = usePrices()

  // The person's saved slippage, once the page is in the browser.
  useEffect(() => {
    const bps = storedSlippage()
    if (bps && bps !== INITIAL_STATE.slippageBps) dispatch({ type: 'slippage', bps })
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(SLIPPAGE_KEY, String(state.slippageBps))
    } catch {
      // Private mode: the choice still applies to this visit.
    }
  }, [state.slippageBps])

  const { direction, stable, bchAsset, bchFrom } = state
  const pair = useMemo<Pair>(
    () =>
      direction === 'local' ? { direction, from: bchFrom, to: bchAsset } : { direction, stable, bchAsset },
    [direction, stable, bchAsset, bchFrom],
  )
  const local = direction === 'local'
  const stableChain = CHAINS[stable.chain]
  const stableKind = stableChain.kind === 'solana' ? 'solana' : 'evm'
  const stableAddress = stableKind === 'solana' ? evm.solanaAddress : evm.evmAddress

  const sides = useMemo(() => pairSides(pair), [pair])
  const pay = { ...sides.pay, key: sides.pay.stable ? stableKey(sides.pay.stable) : sides.pay.symbol }
  const receive = sides.receive

  // A custom recipient replaces the destination wallet: plain BCH going in, or the stablecoin coming out. A swap
  // that stays on Bitcoin Cash lands in the wallet that signs it.
  const recipientAllowed = direction === 'out' || (direction === 'in' && bchAsset === 'BCH')
  const destinationKind = direction === 'in' ? 'bch' : stableKind
  const recipient =
    state.recipient.trim() && recipientAllowed ? checkRecipient(destinationKind, state.recipient) : undefined
  const customTo = recipient?.ok ? recipient.address : undefined

  const bchPlain = direction === 'in' && customTo ? customTo : bch.receive?.plain
  const bchToken = direction === 'in' && customTo ? toTokenAddress(customTo) : bch.receive?.token
  const stableSide = direction === 'out' && customTo ? customTo : stableAddress
  const addresses = useMemo<SwapAddresses | undefined>(() => {
    if (!bchPlain || !bchToken) return undefined
    if (local) return { bchPlain, bchToken }
    return stableSide ? { stableSide, bchPlain, bchToken } : undefined
  }, [local, stableSide, bchPlain, bchToken])

  const amountText = useDebounced(state.amount)
  const amount = toBase(amountText, pay.decimals)

  // The address bar describes the swap on screen, so it can be shared or bookmarked. It follows the settled
  // amount, not each keystroke: Next.js treats every replaceState as a navigation and re-renders the app tree.
  const query = paramsFromState({ ...state, amount: amountText })
  useEffect(() => {
    if (syncUrl) window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}`)
  }, [query, syncUrl])
  const req = useMemo<QuoteRequest | null>(
    () =>
      amount > 0n
        ? { pair, amount, slippageBps: state.slippageBps, ...(addresses ? { addresses } : {}) }
        : null,
    [pair, amount, state.slippageBps, addresses],
  )
  // Each provider answers only for pairs it carries; the others stay idle.
  const near = useRouteQuote('near', req)
  const thor = useRouteQuote('thorchain', req)
  const cauldron = useRouteQuote('cauldron', req)
  const queries = { near, thorchain: thor, cauldron } as const

  const depositFees = useDepositFees(direction === 'in' ? stable : undefined, prices)
  // Gasless (feature 12): USDC on Base through NEAR Intents, when Hashi's relayer holds Base ETH to pay for it.
  const relay = useRelay()
  const gaslessAvailable =
    direction === 'in' && stable.chain === 'base' && stable.symbol === 'USDC' && relay.data?.funded === true

  /** Gas on the paying chain before a bridge takes over; none on a Cauldron-only route. */
  const gasUsd = useCallback(
    (provider: RouteVia) => (provider === 'cauldron' ? undefined : depositFees[provider]?.usd),
    [depositFees],
  )

  const ranked = useMemo(() => {
    const outcomes = [near.data, thor.data, cauldron.data].filter((o): o is RouteOutcome => Boolean(o))
    const outside: OutsideCosts = {}
    for (const outcome of outcomes) {
      if (!outcome.ok || !prices) continue
      const { route } = outcome
      const fee = gasUsd(route.provider)
      const units = fee === undefined ? undefined : costInReceiveUnits(route, prices, fee)
      if (units !== undefined) outside[route.provider] = units
    }
    return rankRoutes(outcomes, outside)
  }, [near.data, thor.data, cauldron.data, gasUsd, prices])

  const selected: Route | undefined =
    ranked.routes.find((r) => r.provider === state.provider) ?? ranked.routes[0]
  const costs = useMemo(() => {
    const byProvider: Partial<Record<RouteVia, RouteCosts | undefined>> = {}
    if (!prices) return byProvider
    for (const route of ranked.routes) {
      byProvider[route.provider] = routeCosts(route, prices, gasUsd(route.provider))
    }
    return byProvider
  }, [ranked.routes, prices, gasUsd])

  const payBalance = balances.assets.get(pay.key)
  const typed = toBase(state.amount, pay.decimals)
  // Dollar values: a stablecoin or BCH from its live price; PUSD and MUSD from Cauldron's price on the route.
  const payUnit =
    selected && prices
      ? payUnitUsd(selected, prices)
      : pay.stable || pay.symbol === 'BCH'
        ? (prices?.[pay.symbol] ?? Number.NaN) / 10 ** pay.decimals
        : undefined
  const payUsd = payUnit === undefined || Number.isNaN(payUnit) ? undefined : Number(typed) * payUnit
  const receiveUnit = selected && prices ? receiveUnitUsd(selected, prices) : undefined
  const receiveUsd =
    selected && receiveUnit !== undefined ? Number(selected.amountOut) * receiveUnit : undefined

  /**
   * Max: the whole balance, except that a BCH send to a bridge keeps back its network fee, and a PUSD ⇄ MUSD trade
   * keeps back Cauldron's 0.1%, which is paid in the sold token on top. (A Cauldron trade from BCH takes its fees
   * out of the amount; one into BCH, out of the proceeds.)
   */
  const tokenSwap = local && bchFrom !== 'BCH' && bchAsset !== 'BCH'
  const max =
    payBalance === undefined
      ? undefined
      : direction === 'out' && bchAsset === 'BCH'
        ? payBalance > BCH_SEND_FEE_SATS
          ? payBalance - BCH_SEND_FEE_SATS
          : 0n
        : tokenSwap
          ? sellableForTokenSwap(payBalance)
          : payBalance
  const maxText = max === undefined ? undefined : formatUnits(max, pay.decimals)

  const step = useMemo<SwapStep>(() => {
    if (typed <= 0n) return { kind: 'enter-amount' }
    if (direction === 'local') {
      if (!bch.receive) return { kind: 'connect-bch' }
    } else if (direction === 'in') {
      if (!stableAddress)
        return { kind: 'connect-stable', namespace: stableKind === 'solana' ? 'solana' : 'eip155' }
      if (state.recipient.trim() && recipient && !recipient.ok)
        return { kind: 'fix-recipient', message: recipient.error }
      if (!customTo && !bch.receive) return { kind: 'connect-bch' }
    } else {
      if (!bch.receive) return { kind: 'connect-bch' }
      if (state.recipient.trim() && recipient && !recipient.ok)
        return { kind: 'fix-recipient', message: recipient.error }
      if (!customTo && !stableAddress)
        return { kind: 'connect-stable', namespace: stableKind === 'solana' ? 'solana' : 'eip155' }
    }
    if (payBalance !== undefined && max !== undefined && typed > max)
      return { kind: 'insufficient', symbol: pay.symbol }
    if (!selected) {
      const pending =
        (near.isFetching && !near.data) ||
        (thor.isFetching && !thor.data) ||
        (cauldron.isFetching && !cauldron.data) ||
        amount !== typed
      if (pending) return { kind: 'finding' }
      const minimums = ranked.unavailable.flatMap((o) =>
        o.reason === 'below-minimum' && o.minimum !== undefined ? [o.minimum] : [],
      )
      if (minimums.length) {
        const [least = 0n] = minimums.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        const amount = formatUnits(minimumToShow(least, pay.decimals, pay.symbol), pay.decimals)
        return { kind: 'below-minimum', amount, symbol: pay.symbol }
      }
      const first = ranked.unavailable[0]
      return { kind: 'no-route', message: first?.message ?? 'No route for this pair right now' }
    }
    if (tokenSwap && selected.cauldron) {
      // No BCH comes out of a token-for-token trade, so the network fee is paid from plain BCH in the wallet.
      const need = bchForTokenSwap(selected.cauldron.pools)
      const plain = balances.assets.get('BCH')
      if (plain !== undefined && plain < need) return { kind: 'needs-bch-fee', sats: need }
    }
    if (direction === 'in' && selected.provider !== 'cauldron') {
      const fee = depositFees[selected.provider]
      const native = balances.native.get(stable.chain)
      if (fee && native !== undefined && native < fee.native) {
        // No ETH for gas: the relayer can still carry a NEAR deposit of Base USDC.
        if (gaslessAvailable && selected.provider === 'near') return { kind: 'review', needsGasless: true }
        return { kind: 'insufficient-gas', symbol: fee.nativeSymbol, chain: stableChain.name }
      }
    }
    return { kind: 'review' }
  }, [
    typed,
    direction,
    stableAddress,
    stableKind,
    state.recipient,
    recipient,
    customTo,
    bch.receive,
    payBalance,
    max,
    pay.symbol,
    pay.decimals,
    selected,
    near.isFetching,
    near.data,
    thor.isFetching,
    thor.data,
    cauldron.isFetching,
    cauldron.data,
    tokenSwap,
    amount,
    ranked.unavailable,
    depositFees,
    balances.native,
    balances.assets,
    stable.chain,
    stableChain.name,
    gaslessAvailable,
  ])

  return {
    state,
    dispatch,
    pair,
    pay,
    receive,
    stableKind,
    stableAddress,
    recipientAllowed,
    recipient,
    addresses,
    req,
    queries,
    ranked,
    selected,
    costs,
    depositFees,
    prices,
    balances,
    payBalance,
    payUsd,
    receiveUsd,
    maxText,
    step,
    gaslessAvailable,
    updating: Boolean(selected && (amount !== typed || queries[selected.provider].isPlaceholderData)),
  }
}

export type Swap = ReturnType<typeof useSwap>
