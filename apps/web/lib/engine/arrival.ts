import { binToHex, decodeTransaction, encodeDataPush, hexToBin } from '@bitauth/libauth'
import { type ArrivalContract, arrivalContract, arrivalFloor } from '@/lib/bch/arrival/contract'
import {
  BelowFloorError,
  buildArrivalReturn,
  completeArrivalTrade,
  FeeShortfallError,
} from '@/lib/bch/arrival/trade'
import { addressHistory, broadcast, listUnspent, rawTransaction, type Utxo } from '@/lib/bch/electrum'
import { ARRIVAL_MIN_COIN_SATS, ARRIVAL_RESERVE_SATS } from '@/lib/constants/fees'
import { ARRIVAL_CONFLICT_RETRIES } from '@/lib/constants/limits'
import { getRouter, offeredBelowFloor, RouterError, routerAsset } from '@/lib/providers/cauldron'
import { spendableForBuy } from './cauldron-fees'
import { advance, isTerminal, type SwapRecord } from './swap'

/**
 * One approval into PUSD or MUSD. The bridge pays a contract made for this one swap (contracts/swap-on-arrival.cash)
 * instead of the person's wallet; when the BCH lands, Hashi builds the Cauldron trade from it and signs with the
 * swap's own trade key, so the wallet is not asked again. The contract lets that trade pay only the person, and never
 * less than the review's "you get at least". If the trade cannot happen, the BCH goes back to the person: the app
 * sends it with the trade key (`release`, whenever they ask, or at the refund time), and the server's keeper sends
 * any that is left once the refund time has passed (`reclaim`, which needs no key).
 */

type Log = (step: string, detail: string) => void
type Arrival = NonNullable<SwapRecord['arrival']>

/** Waiting, not failing: the BCH is not visible at the contract yet, or the trade cannot meet the floor yet. */
export class ArrivalWaiting extends Error {
  constructor(
    message: string,
    readonly reason: 'coin' | 'price',
  ) {
    super(message)
    this.name = 'ArrivalWaiting'
  }
}

/** Sats added to the reserve on each rebuild after a fee shortfall (one more pool's worth of miner fee). */
const SHORTFALL_STEP_SATS = 200n
const FEE_REBUILDS = 2

/** The VM check, fetched the first time a contract transaction is about to go out (it is this feature's heaviest part). */
async function vmVerdict(...args: Parameters<typeof import('@/lib/bch/arrival/vm').verifyInVm>) {
  const { verifyInVm } = await import('@/lib/bch/arrival/vm')
  return verifyInVm(...args)
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))
const isConflict = (error: unknown) =>
  /conflict|missingorspent|missing inputs|already (been )?spent|txn-already/i.test(messageOf(error))

/**
 * The contract's plain-BCH coins, largest first. A bridge pays plain BCH; token coins sent there are not this swap's,
 * and dust (anyone can send some to any address) would cost more in fee than it holds.
 */
export async function contractCoins(arrival: Arrival): Promise<Utxo[]> {
  return (await listUnspent(arrival.address))
    .filter((c) => !c.token && c.value >= ARRIVAL_MIN_COIN_SATS)
    .sort((a, b) => (a.value === b.value ? 0 : a.value < b.value ? 1 : -1))
}

/** The refund time has passed on the clock: the app sends the BCH back with the trade key (no wait on the chain's time). */
const pastRefund = (arrival: Arrival) => Date.now() >= arrival.terms.refundAfter * 1000

/**
 * What already left the contract, found from the chain: any transaction in the contract's history with an input
 * unlocked by this contract (its unlock ends with the redeem script), and what it paid the owner, in the token
 * (a trade) or in BCH (a return). History order is not relied on.
 */
async function contractSpends(arrival: Arrival, contract: ArrivalContract) {
  const redeemPush = binToHex(encodeDataPush(contract.redeemScript))
  const owner = arrival.terms.owner.toLowerCase()
  let traded: { txid: string; amount: bigint } | undefined
  let returned: { txid: string; sats: bigint } | undefined
  for (const { txid } of await addressHistory(arrival.address)) {
    const tx = decodeTransaction(hexToBin(await rawTransaction(txid)))
    if (typeof tx === 'string') continue
    if (!tx.inputs.some((input) => binToHex(input.unlockingBytecode).endsWith(redeemPush))) continue
    for (const output of tx.outputs) {
      if (binToHex(output.lockingBytecode) !== owner) continue
      if (output.token && binToHex(output.token.category) === arrival.terms.tokenCategory) {
        traded = { txid, amount: (traded?.amount ?? 0n) + output.token.amount }
      } else if (!output.token) {
        returned = { txid, sats: (returned?.sats ?? 0n) + output.valueSatoshis }
      }
    }
  }
  return { traded, returned }
}

/** The record once the contract is found empty: traded, returned, or still waiting for the BCH to land. */
async function settledFromChain(record: SwapRecord, arrival: Arrival, contract: ArrivalContract, log: Log) {
  const { traded, returned } = await contractSpends(arrival, contract)
  if (traded) {
    log('arrival', `traded in ${traded.txid}`)
    return advance(record, 'completed', `Swapped into ${record.bchAsset} by the swap contract`, {
      cauldronTxid: traded.txid,
      receivedAmount: traded.amount.toString(),
    })
  }
  if (returned) {
    log('arrival', `BCH back in the wallet: ${returned.txid}`)
    return advance(record, 'bch-arrived', 'The BCH went back to your wallet', {
      bchTxid: returned.txid,
      bchSats: returned.sats.toString(),
      arrival: { ...arrival, returnTxid: returned.txid },
    })
  }
  throw new ArrivalWaiting('Waiting to see the BCH arrive at the swap contract', 'coin')
}

/**
 * Sends each coin back to the owner with the trade key (`release`), each on its own: one that fails never holds up
 * the others. Returns what was sent; throws the first failure only when nothing could be sent.
 */
async function releaseCoins(arrival: Arrival, contract: ArrivalContract, coins: Utxo[], log: Log) {
  const sent: { txid: string; sats: bigint }[] = []
  let failure: unknown
  for (const coin of coins) {
    try {
      const back = buildArrivalReturn({
        contract,
        terms: arrival.terms,
        coin,
        how: 'release',
        tradePrivateKey: arrival.tradeKey,
      })
      const verdict = await vmVerdict(back.transaction, back.sourceOutputs)
      if (verdict !== true) throw new Error(`Hashi stopped before sending the BCH back (${verdict})`)
      const txid = await broadcast(back.hex)
      log('sent', `BCH back to the wallet: ${txid}`)
      sent.push({ txid, sats: back.transaction.outputs[0]?.valueSatoshis ?? 0n })
    } catch (error) {
      log('error', `${coin.txid}:${coin.vout} not sent back: ${messageOf(error)}`)
      failure ??= error
    }
  }
  if (!sent.length && failure) throw failure
  return sent
}

/**
 * The trade, from the contract's largest coin: Router build (held to the floor), the contract's unlock and fee, a VM
 * check of the whole transaction, broadcast. A pool taken by another trade first is rebuilt from fresh pool state; a
 * fee shortfall is rebuilt with more held back; prices under the floor wait (ArrivalWaiting) until the refund time,
 * when the BCH goes back to the wallet instead. Any other coin at the contract goes back to the wallet too.
 */
export async function finishArrival(record: SwapRecord, log: Log): Promise<SwapRecord> {
  const arrival = record.arrival
  if (!arrival || arrival.returnTxid) throw new Error('This swap has no swap contract holding its BCH')
  const asset = record.bchAsset
  if (asset === 'BCH') throw new Error('Plain BCH needs no trade')
  const contract = arrivalContract(arrival.terms)
  const router = getRouter()
  const category = routerAsset(asset)
  let reserve = ARRIVAL_RESERVE_SATS
  let rebuilds = 0

  for (let attempt = 0; ; attempt++) {
    const coins = await contractCoins(arrival)
    const [coin, ...extras] = coins
    if (!coin) return settledFromChain(record, arrival, contract, log)
    const floor = arrivalFloor(arrival.terms, coin.value)
    const available = coin.value - reserve
    let spend = spendableForBuy(available, 1)

    let trade: ReturnType<typeof completeArrivalTrade> | undefined
    let waitMessage: string | undefined
    try {
      if (spend <= 0n) throw new RouterError('insufficient_funds', 'too little BCH for the Cauldron fees')
      const first = await router.quote({ sell: 'bch', buy: category, amount: spend, side: 'sell' })
      if (first.pools > 1) spend = spendableForBuy(available, first.pools)
      const build = await router.build({
        sell: 'bch',
        buy: category,
        amount: spend,
        side: 'sell',
        funding: [
          {
            txid: coin.txid,
            vout: coin.vout,
            value: coin.value,
            scriptHex: binToHex(contract.lockingBytecode),
          },
        ],
        receiveAddress: record.addresses.bchToken,
        changeAddress: record.addresses.bchPlain,
        minOutput: floor,
      })
      trade = completeArrivalTrade({
        build,
        contract,
        terms: arrival.terms,
        tradePrivateKey: arrival.tradeKey,
      })
    } catch (error) {
      if (error instanceof FeeShortfallError && rebuilds < FEE_REBUILDS) {
        // The Router used more pools than quoted (a bigger miner fee): hold back more and build again.
        rebuilds++
        reserve += error.short + SHORTFALL_STEP_SATS
        log('arrival', `fee short by ${error.short} sats; holding back ${reserve} and building again`)
        continue
      }
      const offered = error instanceof BelowFloorError ? error.offered : offeredBelowFloor(error)
      const tooSmall = error instanceof RouterError && /insufficient/i.test(`${error.code} ${error.message}`)
      if (offered === undefined && !tooSmall) throw error
      waitMessage = tooSmall
        ? 'Too little BCH arrived to pay the Cauldron fees, so it goes back to your wallet at the refund time.'
        : `Prices moved: Cauldron now offers less ${asset} than this swap guarantees. Hashi keeps trying, and sends the BCH back to your wallet at the refund time if the price does not return.`
      log(
        'arrival',
        tooSmall ? 'too little BCH to trade' : `Cauldron offers ${offered}, under the floor of ${floor}`,
      )
    }

    if (!trade) {
      if (!pastRefund(arrival)) throw new ArrivalWaiting(waitMessage ?? 'Waiting', 'price')
      return returnArrival(record, log)
    }

    const verdict = await vmVerdict(trade.transaction, trade.sourceOutputs)
    if (verdict !== true)
      throw new Error(`Hashi stopped before sending: the network would refuse this trade (${verdict})`)
    log(
      'arrival',
      `${trade.received} ${asset} units (floor ${trade.floor}), ${trade.size} bytes, fee ${trade.fee}`,
    )
    let txid: string
    try {
      txid = await broadcast(trade.hex)
    } catch (error) {
      if (!isConflict(error) || attempt + 1 >= ARRIVAL_CONFLICT_RETRIES) throw error
      // Another trade took one of the pools first (nothing was spent), or this trade already went out from another
      // tab: look again from the chain on the next pass.
      log('arrival', `conflict, looking again (${messageOf(error)})`)
      continue
    }
    log('sent', txid)
    // Rare: a bridge that paid in more than one output. The trade took the largest; the rest goes to the wallet.
    if (extras.length)
      await releaseCoins(arrival, contract, extras, log).catch((e) => log('error', messageOf(e)))
    return advance(
      record,
      'completed',
      `Swapped into ${asset} by the swap contract, with no approval needed`,
      {
        cauldronTxid: txid,
        receivedAmount: trade.received.toString(),
      },
    )
  }
}

/**
 * Every coin at the contract back to the person with the trade key (`release`: any time, no wait on the chain's
 * clock). The first return turns the swap into a two-approval one: the person trades the BCH from their wallet.
 * BCH that lands later (a second payout, after a trade or an earlier return) goes back too, and the swap keeps its
 * state: a finished swap stays finished, with the return noted in its history.
 */
export async function returnArrival(record: SwapRecord, log: Log): Promise<SwapRecord> {
  const arrival = record.arrival
  if (!arrival) throw new Error('This swap has no swap contract')
  const contract = arrivalContract(arrival.terms)
  const coins = await contractCoins(arrival)
  const settled = isTerminal(record) || arrival.returnTxid !== undefined
  if (!coins.length) return settled ? record : settledFromChain(record, arrival, contract, log)
  const sent = await releaseCoins(arrival, contract, coins, log)
  const [first] = sent
  if (!first) throw new Error('Nothing was sent back')
  const sats = sent.reduce((sum, s) => sum + s.sats, 0n)
  if (settled) {
    return advance(record, record.status, `${sats} more sats went back to your wallet (${first.txid})`, {
      arrival: { ...arrival, returnTxid: arrival.returnTxid ?? first.txid },
    })
  }
  return advance(record, 'bch-arrived', 'The BCH is back in your wallet', {
    bchTxid: first.txid,
    bchSats: sats.toString(),
    arrival: { ...arrival, returnTxid: first.txid },
  })
}
