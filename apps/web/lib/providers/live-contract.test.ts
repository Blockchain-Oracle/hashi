import { describe, expect, it } from 'vitest'
import { STABLES } from '@/lib/constants/assets'
import { PLACEHOLDER_ADDRESS } from '@/lib/engine/placeholders'
import { getNearQuote, getNearStatus, getNearTokens } from './near'
import { getThorInbound, getThorPools, getThorQuote, getThorStatus, isThorHaltError } from './thorchain'

/**
 * Hashi's own provider code against the real APIs: every answer it reads must pass its schemas as the API sends it
 * today. Opt-in (it calls mainnet services, and creates one unfunded NEAR deposit address); run it whenever a
 * provider may have changed:
 *
 *     LIVE=1 pnpm vitest run apps/web/lib/providers/live-contract.test.ts
 *
 * Written after NEAR began sending `null` for unset fields its OpenAPI file calls optional, which stalled every
 * tracker on 2026-11-18.
 */
const live = process.env.LIVE === '1'
const BASE_USDC = STABLES.find((s) => s.chain === 'base' && s.symbol === 'USDC')
const NEAR_BCH = 'nep141:bch.omft.near'
/** A finished BCH → RUNE swap on THORChain (Midgard, 2026-11-18). */
const THOR_DONE = '923243ECE3B4784108E9FF2D0074657A032F9EF9BAFE92402D8BD8483197E54C'

describe.runIf(live)('live provider contracts', { timeout: 60_000 }, () => {
  it('NEAR Intents: tokens', async () => {
    const tokens = await getNearTokens()
    expect(tokens.some((t) => t.assetId === NEAR_BCH)).toBe(true)
  })

  it('NEAR Intents: a deposit address, then its status while it waits', async () => {
    if (!BASE_USDC) throw new Error('no Base USDC in STABLES')
    const quote = await getNearQuote({
      dry: false,
      swapType: 'EXACT_INPUT',
      originAsset: BASE_USDC.nearAssetId,
      destinationAsset: NEAR_BCH,
      amount: 1_000_000n,
      recipient: PLACEHOLDER_ADDRESS.bch,
      refundTo: PLACEHOLDER_ADDRESS.evm,
      slippageBps: 100,
      deadline: new Date(Date.now() + 30 * 60_000),
    })
    const deposit = quote.quote.depositAddress
    expect(deposit).toBeTruthy()
    const status = await getNearStatus(deposit as string)
    expect(status.status).toBe('PENDING_DEPOSIT')
    expect(status.quoteResponse?.quote?.minAmountIn).toBeTruthy()
  })

  it('THORChain: inbound addresses, pools and a quote', async () => {
    const inbound = await getThorInbound()
    expect(inbound.some((c) => c.chain === 'BCH')).toBe(true)
    const pools = await getThorPools()
    expect(pools.some((p) => p.asset === 'BCH.BCH')).toBe(true)
    // A pair THORChain has paused answers with an error Hashi must recognise as a pause; any other pair, a quote.
    const quote = await getThorQuote({ fromAsset: 'BCH.BCH', toAsset: 'ETH.ETH', amount: 10_000_000n }).catch(
      (error: unknown) => {
        expect(isThorHaltError(error)).toBe(true)
        return undefined
      },
    )
    if (quote) expect(BigInt(quote.expected_amount_out)).toBeGreaterThan(0n)
  })

  it('THORChain: status of a swap it has not seen, and of a finished one', async () => {
    const unseen = await getThorStatus('AB'.repeat(32))
    expect(unseen.tx).toBeUndefined()
    const done = await getThorStatus(THOR_DONE)
    expect(done.tx?.id?.toUpperCase()).toBe(THOR_DONE)
    expect(done.out_txs?.length).toBeGreaterThan(0)
  })
})
