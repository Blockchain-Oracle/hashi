import { arrivalContract } from '@/lib/bch/arrival/contract'
import { arrivalTermsSchema, checkArrivalTerms } from '@/lib/bch/arrival/policy'
import { countArrivals, lastHeartbeat, saveArrival, storeOnVolume } from '@/lib/bch/arrival/store.server'
import { ARRIVAL_STORE_MAX, KEEPER_STALE_MS } from '@/lib/constants/limits'
import { serverEnv } from '@/lib/env.server'
import { createLimiter } from '@/lib/relay/policy'

/**
 * A swap contract's public terms, kept before the deposit is asked for, so the server's keeper can send the BCH back
 * to its owner after the refund time even if the browser that started the swap is gone (cleared storage, another
 * device). Public data only: the trade key's private half never leaves the browser, and the contract pays only its
 * owner whoever runs it.
 */

/** A person starts a handful of swaps an hour at most. */
const perIp = createLimiter(30, 60 * 60_000)
const MAX_BODY_BYTES = 2_000

/**
 * Why the keeper cannot be counted on right now, or undefined when it can. A contract the keeper might not reach is
 * never made: the browser then has the bridge pay the wallet instead (two approvals, nothing at risk).
 */
async function keeperProblem(): Promise<string | undefined> {
  if (!serverEnv.ARRIVAL_SWEEP_TOKEN) return 'no keeper is set up'
  if (!(await storeOnVolume())) return 'the store is not on a persistent volume'
  const beat = await lastHeartbeat()
  if (!beat || Date.now() - beat > KEEPER_STALE_MS) return 'the keeper has not run recently'
  if ((await countArrivals()) >= ARRIVAL_STORE_MAX) return 'the store is full'
  return undefined
}

/** Whether a swap contract can be made now: the swap screen counts approvals from it (one with a contract, two without). */
export async function GET() {
  return Response.json(
    { ready: (await keeperProblem()) === undefined },
    { headers: { 'cache-control': 'no-store' } },
  )
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!perIp(ip))
    return Response.json({ error: 'Too many swaps from here; try again later' }, { status: 429 })
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return Response.json({ error: 'Too large' }, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return Response.json({ error: 'Not JSON' }, { status: 400 })
  }
  const parsed = arrivalTermsSchema.safeParse((body as { terms?: unknown } | null)?.terms)
  if (!parsed.success) return Response.json({ error: 'Not swap contract terms' }, { status: 400 })
  const refused = checkArrivalTerms(parsed.data, Date.now())
  if (refused) return Response.json({ error: refused }, { status: 400 })
  const problem = await keeperProblem()
  if (problem) return Response.json({ error: `Swap contracts are paused: ${problem}` }, { status: 503 })
  // The address is worked out here from the terms, never taken from the request.
  const { address } = arrivalContract(parsed.data)
  await saveArrival({ address, terms: parsed.data, createdAt: Date.now() })
  return Response.json({ address })
}
