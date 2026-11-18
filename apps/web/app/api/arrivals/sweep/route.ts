import { timingSafeEqual } from 'node:crypto'
import { arrivalContract } from '@/lib/bch/arrival/contract'
import { listArrivals, removeArrival, writeHeartbeat } from '@/lib/bch/arrival/store.server'
import { buildArrivalReturn } from '@/lib/bch/arrival/trade'
import { verifyInVm } from '@/lib/bch/arrival/vm'
import { addressHistory, broadcast, listUnspent } from '@/lib/bch/electrum'
import { ARRIVAL_MIN_COIN_SATS } from '@/lib/constants/fees'
import { SWEEP_BUDGET_MS } from '@/lib/constants/limits'
import { serverEnv } from '@/lib/env.server'

/**
 * The keeper, run by a scheduled task: every swap contract past its refund time that still holds plain BCH sends it
 * back to its owner with `reclaim`, which needs no key (the contract pays nobody else). A node that answers "not final
 * yet" (the chain's median time has not passed the refund time) is tried again next run. Contracts never paid are
 * forgotten a day after their refund time, emptied ones a week after. Each run writes a heartbeat: without a recent
 * one, the server stops accepting new contracts and swaps pay the wallet instead.
 */

const DAY_S = 24 * 60 * 60
const FORGET_UNPAID_AFTER_S = DAY_S
const FORGET_EMPTIED_AFTER_S = 7 * DAY_S

/** One sweep at a time in this server. */
let running = false

function authorised(request: Request) {
  const token = serverEnv.ARRIVAL_SWEEP_TOKEN
  if (!token) return false
  // Compared as bytes: a string's length counts UTF-16 units, and timingSafeEqual throws on unequal byte lengths.
  const given = Buffer.from(request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '')
  const expected = Buffer.from(token)
  return given.byteLength === expected.byteLength && timingSafeEqual(given, expected)
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

export async function POST(request: Request) {
  if (!authorised(request)) return Response.json({ error: 'Not allowed' }, { status: 401 })
  if (running) return Response.json({ error: 'A sweep is already running' }, { status: 409 })
  running = true
  const started = Date.now()
  const now = Math.floor(started / 1000)
  const report: { address: string; result: string }[] = []
  let left = 0
  try {
    for (const entry of await listArrivals()) {
      if (now < entry.terms.refundAfter) continue
      // Oldest refund time first, so whatever the budget leaves for the next run is the newest.
      if (Date.now() - started > SWEEP_BUDGET_MS) {
        left++
        continue
      }
      try {
        // Coins too small to pay their own return fee are left alone (anyone can send dust to an address).
        const coins = (await listUnspent(entry.address)).filter(
          (c) => !c.token && c.value >= ARRIVAL_MIN_COIN_SATS,
        )
        if (!coins.length) {
          const age = now - entry.terms.refundAfter
          if (age > FORGET_UNPAID_AFTER_S) {
            const used = (await addressHistory(entry.address)).length
            if (used === 0 || age > FORGET_EMPTIED_AFTER_S) {
              await removeArrival(entry.address)
              report.push({
                address: entry.address,
                result: used ? 'forgotten (emptied)' : 'forgotten (never paid)',
              })
            }
          }
          continue
        }
        const contract = arrivalContract(entry.terms)
        for (const coin of coins) {
          // Each coin on its own: one that fails never holds up the others.
          try {
            const back = buildArrivalReturn({ contract, terms: entry.terms, coin, how: 'reclaim' })
            const verdict = verifyInVm(back.transaction, back.sourceOutputs)
            if (verdict !== true) {
              report.push({ address: entry.address, result: `not sent: ${verdict}` })
              continue
            }
            const txid = await broadcast(back.hex)
            report.push({ address: entry.address, result: `returned ${coin.value} sats: ${txid}` })
          } catch (error) {
            const message = messageOf(error)
            // The chain's median time trails the clock; "non-final" just means not yet.
            report.push({
              address: entry.address,
              result: /non-final/i.test(message) ? 'not final yet' : message,
            })
          }
        }
      } catch (error) {
        report.push({ address: entry.address, result: messageOf(error) })
      }
    }
    await writeHeartbeat()
  } finally {
    running = false
  }
  return Response.json({ actions: report.length, left, report })
}
