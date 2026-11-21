import { NEAR_ONE_CLICK_URL } from '@/lib/constants/providers'
import { serverEnv } from '@/lib/env.server'

/**
 * NEAR Intents quotes, sent from Hashi's server with its partner key (Distribution Channel type): quotes then follow
 * the partner fee schedule instead of the 0.25% that unauthenticated requests pay, and the key never reaches a
 * browser. Only Hashi's own quote requests pass (its referral), at a pace no swap screen needs to exceed; NEAR's
 * answer, error or not, goes back unchanged, so "amount too low" and the rest read exactly as before.
 */
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4_000
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 120
const seen = new Map<string, { start: number; count: number }>()

function allowed(ip: string): boolean {
  const now = Date.now()
  const entry = seen.get(ip)
  if (!entry || now - entry.start > WINDOW_MS) {
    seen.set(ip, { start: now, count: 1 })
    if (seen.size > 5_000) seen.clear()
    return true
  }
  entry.count += 1
  return entry.count <= MAX_PER_WINDOW
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (!allowed(ip))
    return Response.json({ message: 'Too many quote requests; try again in a minute' }, { status: 429 })
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES)
    return Response.json({ message: 'Quote request too large' }, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return Response.json({ message: 'Quote request is not JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || (body as { referral?: unknown }).referral !== 'hashi') {
    return Response.json({ message: 'Not a Hashi quote request' }, { status: 400 })
  }
  const key = serverEnv.NEAR_INTENTS_JWT
  const upstream = await fetch(`${NEAR_ONE_CLICK_URL}/v0/quote`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(key ? { 'x-api-key': key } : {}),
    },
    body: text,
    signal: request.signal,
    cache: 'no-store',
  })
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  })
}
