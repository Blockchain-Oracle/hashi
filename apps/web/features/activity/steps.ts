import type { TimelineStep } from '@/components/kit/step-timeline'
import { BCH_ASSETS, type BchAssetId, STABLES, type StableSymbol } from '@/lib/constants/assets'
import { CHAINS, type ChainId } from '@/lib/constants/chains'
import { nearIntentsUrl, thorchainUrl, txUrl } from '@/lib/constants/explorers'
import type { SwapRecord, SwapStatus } from '@/lib/engine/swap'
import { PROVIDERS } from '@/lib/engine/types'
import { displayDecimals, formatAmount, formatDuration } from '@/lib/format'

/**
 * How a saved swap reads on screen: its steps across both chains (the tracker's spine), a headline, and whether
 * the tab can be closed. Derived from the record alone, so a reopened swap draws exactly as it was left.
 */

const ORDER: SwapStatus[] = ['quoted', 'deposit-sent', 'bridging', 'bch-arrived', 'swapping', 'completed']

/** The end states that stop a swap before it completes. */
const STOPPED: SwapStatus[] = ['refunded', 'failed', 'expired']

function reached(record: SwapRecord, status: SwapStatus) {
  if (STOPPED.includes(record.status)) {
    return record.events.some((e) => e.status === status)
  }
  return ORDER.indexOf(record.status) >= ORDER.indexOf(status)
}

function timeOf(record: SwapRecord, status: SwapStatus): string | undefined {
  const at = record.events.find((e) => e.status === status)?.at
  return at
    ? new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : undefined
}

export function stableOf(record: SwapRecord) {
  return STABLES.find((s) => s.chain === record.stable?.chain && s.symbol === record.stable?.symbol)
}

function bchSide(id: BchAssetId) {
  return { symbol: id, decimals: BCH_ASSETS[id].decimals, chain: 'bch' as ChainId }
}

/** The stablecoin side of a bridged record (a swap that stays on Bitcoin Cash has none). */
function stableSide(record: SwapRecord) {
  const stable = stableOf(record)
  return stable
    ? { symbol: stable.symbol, decimals: stable.decimals, chain: stable.chain as ChainId }
    : undefined
}

export function paySide(record: SwapRecord): {
  symbol: StableSymbol | BchAssetId
  decimals: number
  chain: ChainId
} {
  if (record.direction === 'local') return bchSide(record.bchFrom ?? 'BCH')
  if (record.direction === 'in') return stableSide(record) ?? bchSide(record.bchAsset)
  return bchSide(record.bchAsset)
}

export function receiveSide(record: SwapRecord): {
  symbol: StableSymbol | BchAssetId
  decimals: number
  chain: ChainId
} {
  if (record.direction === 'out') return stableSide(record) ?? bchSide(record.bchAsset)
  return bchSide(record.bchAsset)
}

/** Seconds left on the quoted estimate, counted from the deposit; undefined before it or once done. */
export function secondsLeft(record: SwapRecord, now: number): number | undefined {
  const sent = record.events.find((e) => e.status === 'deposit-sent')?.at
  const eta = record.quoted?.etaSeconds
  if (!sent || !eta || !['deposit-sent', 'bridging'].includes(record.status)) return undefined
  return Math.round((sent + eta * 1000 - now) / 1000)
}

/** The swap on its bridge's own explorer (NEAR Intents by deposit address, THORChain by inbound hash). */
export function bridgeExplorerUrl(record: SwapRecord): string | undefined {
  if (record.provider === 'near')
    return record.depositAddress ? nearIntentsUrl(record.depositAddress) : undefined
  if (record.provider !== 'thorchain') return undefined
  const inbound = record.direction === 'in' ? record.depositTx : record.bchTxid
  return inbound ? thorchainUrl(inbound) : undefined
}

export function trackerSteps(record: SwapRecord, now: number): TimelineStep[] {
  const pay = paySide(record)
  const provider = PROVIDERS[record.provider].name
  const amountIn = `${formatAmount(BigInt(record.amountIn), pay.decimals, displayDecimals(pay.symbol))} ${pay.symbol}`
  const bridgeHref = bridgeExplorerUrl(record)
  const left = secondsLeft(record, now)
  const bridgeAt =
    left === undefined ? timeOf(record, 'bridging') : left > 0 ? formatDuration(left) : 'any moment'
  const token = record.bchAsset !== 'BCH'
  const steps: TimelineStep[] = []

  const state = (done: boolean, active: boolean): TimelineStep['state'] =>
    done ? 'done' : active ? 'active' : 'pending'
  const stable = record.stable

  if (record.direction === 'local' || !stable) {
    // Staying on Bitcoin Cash: one Cauldron trade, then the asset is in the wallet.
    const receive = receiveSide(record)
    steps.push({
      id: 'swap',
      title: `Swap ${amountIn} for ${record.bchAsset} on Cauldron`,
      detail: record.cauldronTxid
        ? 'One Bitcoin Cash transaction'
        : 'One approval in your Bitcoin Cash wallet',
      chain: 'bch',
      state: state(record.status === 'completed', record.status === 'quoted'),
      ...(timeOf(record, 'completed') ? { at: timeOf(record, 'completed') as string } : {}),
      ...(record.cauldronTxid ? { href: txUrl('bch', record.cauldronTxid) } : {}),
    })
    steps.push({
      id: 'arrive',
      title: `${record.bchAsset === 'BCH' ? 'BCH' : BCH_ASSETS[record.bchAsset].name} arrives in your wallet`,
      ...(record.receivedAmount
        ? {
            detail: `${formatAmount(BigInt(record.receivedAmount), receive.decimals, displayDecimals(receive.symbol))} ${receive.symbol}`,
          }
        : {}),
      chain: 'bch',
      state: state(record.status === 'completed', false),
      ...(timeOf(record, 'completed') ? { at: timeOf(record, 'completed') as string } : {}),
    })
  } else if (record.direction === 'in') {
    steps.push({
      id: 'deposit',
      title: `Deposit ${amountIn}`,
      detail: record.depositTx
        ? `On ${CHAINS[stable.chain].name}`
        : `Approve in your ${CHAINS[stable.chain].name} wallet`,
      chain: stable.chain,
      state: state(Boolean(record.depositTx) || reached(record, 'deposit-sent'), record.status === 'quoted'),
      ...(timeOf(record, 'deposit-sent') ? { at: timeOf(record, 'deposit-sent') as string } : {}),
      ...(record.depositTx ? { href: txUrl(stable.chain, record.depositTx) } : {}),
    })
    steps.push({
      id: 'bridge',
      title: `${provider} turns it into BCH`,
      detail:
        record.provider === 'near'
          ? 'Solvers fill the swap; usually a few minutes'
          : 'THORChain swaps through its pools',
      chain: 'bch',
      state: state(reached(record, 'bch-arrived'), ['deposit-sent', 'bridging'].includes(record.status)),
      ...(bridgeAt ? { at: bridgeAt } : {}),
      ...(bridgeHref ? { href: bridgeHref } : {}),
    })
    steps.push({
      id: 'arrive',
      title: record.arrival
        ? record.arrival.returnTxid
          ? 'BCH back in your wallet'
          : 'BCH arrives at your swap contract'
        : 'BCH arrives in your wallet',
      ...(record.bchSats ? { detail: `${formatAmount(BigInt(record.bchSats), 8, 8)} BCH` } : {}),
      chain: 'bch',
      state: state(reached(record, 'bch-arrived') || (!token && record.status === 'completed'), false),
      ...(timeOf(record, token ? 'bch-arrived' : 'completed')
        ? { at: timeOf(record, token ? 'bch-arrived' : 'completed') as string }
        : {}),
      ...(record.bchTxid ? { href: txUrl('bch', record.bchTxid) } : {}),
    })
    if (token) {
      steps.push({
        id: 'cauldron',
        title: `Swap into ${record.bchAsset} on Cauldron`,
        detail: record.cauldronTxid
          ? BCH_ASSETS[record.bchAsset].name
          : record.arrival && !record.arrival.returnTxid
            ? 'Automatic: the swap contract pays only your wallet'
            : 'One approval in your Bitcoin Cash wallet',
        chain: 'bch',
        state: state(
          record.status === 'completed',
          record.status === 'bch-arrived' || record.status === 'swapping',
        ),
        ...(timeOf(record, 'completed') ? { at: timeOf(record, 'completed') as string } : {}),
        ...(record.cauldronTxid ? { href: txUrl('bch', record.cauldronTxid) } : {}),
      })
    }
  } else {
    const stableName = `${stable.symbol} on ${CHAINS[stable.chain].name}`
    if (token) {
      steps.push({
        id: 'sell',
        title: `Sell ${amountIn} on Cauldron`,
        detail: 'One approval in your Bitcoin Cash wallet',
        chain: 'bch',
        state: state(
          Boolean(record.cauldronTxid) || reached(record, 'deposit-sent'),
          record.status === 'quoted' && !record.cauldronTxid,
        ),
        ...(record.cauldronTxid ? { href: txUrl('bch', record.cauldronTxid) } : {}),
      })
    }
    steps.push({
      id: 'deposit',
      title: token ? `Send the BCH to ${provider}` : `Send ${amountIn} to ${provider}`,
      detail: record.bchTxid
        ? 'Waits for one Bitcoin Cash block (~10 min)'
        : 'One approval in your Bitcoin Cash wallet',
      chain: 'bch',
      state: state(
        Boolean(record.bchTxid),
        record.status === 'quoted' && (!token || Boolean(record.cauldronTxid)),
      ),
      ...(timeOf(record, 'deposit-sent') ? { at: timeOf(record, 'deposit-sent') as string } : {}),
      ...(record.bchTxid ? { href: txUrl('bch', record.bchTxid) } : {}),
    })
    steps.push({
      id: 'bridge',
      title: `${provider} turns it into ${stable.symbol}`,
      detail: 'Starts once the deposit has one confirmation',
      state: state(record.status === 'completed', ['deposit-sent', 'bridging'].includes(record.status)),
      ...(bridgeAt ? { at: bridgeAt } : {}),
      ...(bridgeHref ? { href: bridgeHref } : {}),
    })
    steps.push({
      id: 'arrive',
      title: `${stableName} arrives`,
      chain: stable.chain,
      state: state(record.status === 'completed', false),
      ...(timeOf(record, 'completed') ? { at: timeOf(record, 'completed') as string } : {}),
      ...(record.payoutTx ? { href: txUrl(stable.chain, record.payoutTx) } : {}),
    })
  }

  if (STOPPED.includes(record.status)) {
    const firstOpen = steps.find((s) => s.state !== 'done')
    if (firstOpen) firstOpen.state = 'failed'
    const note = record.events.at(-1)?.note
    steps.push({
      id: 'end',
      title:
        record.status === 'refunded'
          ? 'Refunded to your wallet'
          : record.status === 'expired'
            ? 'The quote expired'
            : 'The swap failed',
      ...(note ? { detail: note } : {}),
      state: 'failed',
      ...(timeOf(record, record.status) ? { at: timeOf(record, record.status) as string } : {}),
      ...(record.payoutTx
        ? { href: txUrl(record.direction === 'in' && stable ? stable.chain : 'bch', record.payoutTx) }
        : {}),
    })
  }
  return steps
}

export interface Headline {
  title: string
  /** Whether the tab can close, in plain words. */
  close: string
}

export function headline(record: SwapRecord): Headline {
  const stable = record.stable
  const into =
    record.direction === 'in' || !stable
      ? 'into Bitcoin Cash'
      : `to ${stable.symbol} on ${CHAINS[stable.chain].name}`
  switch (record.status) {
    case 'quoted':
      if (record.cauldronTxid) {
        return {
          title: `Send the BCH to ${PROVIDERS[record.provider].name}`,
          close: `Your ${record.bchAsset} was sold and the BCH is in your wallet. One more approval sends it on.`,
        }
      }
      return record.direction === 'local'
        ? { title: 'Approve the swap', close: 'Nothing has left your wallet yet.' }
        : { title: 'Approve the deposit', close: 'Nothing has been sent yet.' }
    case 'deposit-sent':
    case 'bridging':
      return {
        title: `Bridging ${into}`,
        close:
          record.direction === 'in' && record.bchAsset !== 'BCH'
            ? record.arrival
              ? `Safe to close: Hashi turns the BCH into ${record.bchAsset} the next time this page is open, with no approval. If not, the BCH goes back to your wallet on its own within about two hours.`
              : `Safe to close: the BCH arrives on its own. Come back for one approval that turns it into ${record.bchAsset}.`
            : 'Safe to close this tab: the bridge delivers on its own.',
      }
    case 'bch-arrived':
    case 'swapping':
      return record.arrival && !record.arrival.returnTxid
        ? {
            title: `Turning the BCH into ${record.bchAsset}`,
            close: 'No approval needed: the swap contract can only pay your wallet.',
          }
        : {
            title: `One approval left`,
            close: `The BCH is in your wallet. Approve the swap into ${record.bchAsset} whenever you are ready.`,
          }
    case 'completed':
      return { title: 'Swap complete', close: 'All done.' }
    case 'refunded':
      return { title: 'Refunded', close: 'Your deposit went back to the refund address.' }
    case 'failed':
      return { title: 'The swap failed', close: 'See the details below.' }
    case 'expired':
      return {
        title: 'Quote expired',
        close: 'Nothing was sent: the quote ran out before your first approval. Start again for a fresh one.',
      }
  }
}
