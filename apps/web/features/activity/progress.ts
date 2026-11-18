import { CHAINS } from '@/lib/constants/chains'
import { NEAR_BCH_CONFIRMATIONS } from '@/lib/constants/limits'
import type { BridgeReading } from '@/lib/engine/runner'
import type { SwapRecord } from '@/lib/engine/swap'

export type { BridgeReading }

/**
 * What is happening to a swap while a bridge carries it, read live: Bitcoin Cash blocks from Electrum, and each
 * bridge's own status. A countdown is shown only where the bridge gives one (NEAR's swap estimate once it is
 * swapping, THORChain's confirmation and payout timers). Blocks come at random, so waiting for one counts blocks
 * and the time since the last one, never a countdown that would run out while nothing happened.
 */

/** The Bitcoin Cash chain around the swap's own BCH deposit, as Electrum last reported it. */
export interface ChainReading {
  tip: number
  /** When the tip's block was mined (ms). */
  tipAt: number
  /** The deposit's block: 0 while in the mempool, undefined until a server knows it. */
  depositHeight?: number
  /** When the block the bridge waits for was mined (ms), once it has been. */
  confirmedAt?: number
}

export interface LiveProgress {
  /** Who has the swap now. */
  who: 'bch' | 'near' | 'thorchain'
  title: string
  note: string
  /** Waiting for Bitcoin Cash blocks: how many the bridge has, of how many it needs, and when the last was mined. */
  blocks?: { have: number; need: number; lastAt: number }
  /** The bridge's own estimate: when it ends (and, when known, when it began). Past its end it counts up. */
  countdown?: { to: number; from?: number; of: string }
  /** Waiting with no estimate: the time waited, from here. */
  since?: number
  /** When the bridge sends back a swap it has not finished (ms). */
  refundAt?: number
}

function minutes(seconds: number) {
  const m = Math.max(1, Math.round(seconds / 60))
  return m === 1 ? 'a minute' : `${m} minutes`
}

export function liveProgress(
  record: SwapRecord,
  bridge: BridgeReading | null | undefined,
  chain: ChainReading | null | undefined,
): LiveProgress | undefined {
  const stable = record.stable
  if (!stable || !['deposit-sent', 'bridging'].includes(record.status)) return undefined
  const out = record.direction === 'out'
  const chainName = CHAINS[stable.chain].name
  const sentAt = record.events.find((e) => e.status === 'deposit-sent')?.at ?? record.updatedAt
  const lands = out
    ? `Then ${stable.symbol} lands in your wallet on ${chainName}.`
    : record.arrival && !record.arrival.returnTxid
      ? `Then the BCH lands at your swap contract, and Hashi turns it into ${record.bchAsset}.`
      : 'Then the BCH lands in your wallet.'

  if (record.provider === 'near') {
    const quote = record.bridgeQuote as
      | { quote?: { timeEstimate?: number }; quoteRequest?: { deadline?: string } }
      | undefined
    const deadline = quote?.quoteRequest?.deadline ? Date.parse(quote.quoteRequest.deadline) : Number.NaN
    const refund = Number.isFinite(deadline) ? { refundAt: deadline } : {}
    const swapSeconds = quote?.quote?.timeEstimate
    const status = bridge?.near?.status

    if (status === 'PROCESSING' && bridge?.near) {
      const from = bridge.near.updatedAt
      return {
        who: 'near',
        title: `NEAR Intents is swapping into ${out ? stable.symbol : 'BCH'}`,
        note: lands,
        // Coming out, the blocks it waited for stay on screen, done, ahead of the swap.
        ...(out && chain
          ? { blocks: { have: NEAR_BCH_CONFIRMATIONS, need: NEAR_BCH_CONFIRMATIONS, lastAt: chain.tipAt } }
          : {}),
        ...(swapSeconds
          ? { countdown: { from, to: from + swapSeconds * 1000, of: 'NEAR’s estimate' } }
          : { since: from }),
        ...refund,
      }
    }
    if (status === 'INCOMPLETE_DEPOSIT') {
      return {
        who: 'near',
        title: 'NEAR Intents got less than the quote',
        note: 'It sends what arrived back to your wallet by the refund time.',
        since: sentAt,
        ...refund,
      }
    }
    if (!out) {
      return {
        who: 'near',
        title: `NEAR Intents is seeing your deposit on ${chainName}`,
        note: `It takes the deposit once ${chainName} confirms it, then swaps in about ${minutes(swapSeconds ?? 60)}.`,
        since: sentAt,
        ...refund,
      }
    }
    // Coming out: NEAR takes a Bitcoin Cash deposit after NEAR_BCH_CONFIRMATIONS blocks.
    const need = NEAR_BCH_CONFIRMATIONS
    if (!chain) {
      return {
        who: 'bch',
        title: 'Reading the Bitcoin Cash chain',
        note: `NEAR Intents takes the deposit after ${need} blocks.`,
        since: sentAt,
        ...refund,
      }
    }
    const have = chain.depositHeight ? Math.max(0, chain.tip - chain.depositHeight + 1) : 0
    if (have < need) {
      return {
        who: 'bch',
        title:
          have === 0
            ? 'Waiting for the first Bitcoin Cash block'
            : `Waiting for block ${have + 1} of ${need}`,
        note: `Blocks come about every 10 minutes, at random. NEAR Intents takes the deposit after block ${need}, then swaps in about ${minutes(swapSeconds ?? 120)}.`,
        blocks: { have, need, lastAt: chain.tipAt },
        ...refund,
      }
    }
    return {
      who: 'near',
      title: 'NEAR Intents is taking the deposit',
      note: `${have} blocks in: NEAR usually takes it within minutes, then swaps in about ${minutes(swapSeconds ?? 120)}.`,
      blocks: { have: need, need, lastAt: chain.tipAt },
      ...(chain.confirmedAt ? { since: chain.confirmedAt } : have === need ? { since: chain.tipAt } : {}),
      ...refund,
    }
  }

  if (record.provider !== 'thorchain') return undefined
  const thor = bridge?.thor
  const asset = out ? stable.symbol : 'BCH'
  if (!thor?.observed) {
    return {
      who: 'thorchain',
      title: out
        ? 'THORChain is looking for your deposit'
        : `THORChain is looking for your deposit on ${chainName}`,
      note: 'It sees a deposit within a minute or two of it being sent.',
      since: sentAt,
    }
  }
  if (!thor.confirmed) {
    return {
      who: out ? 'bch' : 'thorchain',
      title: out
        ? 'THORChain is waiting for Bitcoin Cash blocks'
        : `THORChain is waiting for ${chainName} confirmations`,
      note: out
        ? 'It waits for more blocks on bigger deposits (up to 3 on Bitcoin Cash), then swaps.'
        : 'It waits for the deposit to be final on its chain, then swaps.',
      ...(thor.confirmSecondsLeft !== undefined
        ? {
            countdown: {
              to: (bridge?.at ?? sentAt) + thor.confirmSecondsLeft * 1000,
              of: 'THORChain’s estimate',
            },
          }
        : { since: sentAt }),
    }
  }
  if (!thor.swapped) {
    return {
      who: 'thorchain',
      title: `THORChain is swapping into ${asset}`,
      note: lands,
      since: bridge?.at ?? sentAt,
    }
  }
  if (!thor.sent) {
    return {
      who: 'thorchain',
      title: `THORChain is sending the ${asset}`,
      note: 'It holds bigger payouts back for a short while, then signs them.',
      ...(thor.outboundSecondsLeft
        ? {
            countdown: {
              to: (bridge?.at ?? sentAt) + thor.outboundSecondsLeft * 1000,
              of: 'THORChain’s delay',
            },
          }
        : { since: bridge?.at ?? sentAt }),
    }
  }
  return {
    who: 'thorchain',
    title: `THORChain sent the ${asset}`,
    note: 'Waiting for it to land.',
    since: bridge?.at ?? sentAt,
  }
}

/** "4:07", or "1:02:07" past an hour. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** The few words the timeline's bridge row shows beside it. */
export function shortProgress(progress: LiveProgress, now: number): string {
  if (progress.countdown) {
    const left = progress.countdown.to - now
    return left >= 0 ? `${clock(left)} left` : `${clock(-left)} over`
  }
  if (progress.blocks && progress.blocks.have < progress.blocks.need) {
    return `block ${progress.blocks.have} of ${progress.blocks.need}`
  }
  return progress.since !== undefined ? `${clock(now - progress.since)} waiting` : 'now'
}
