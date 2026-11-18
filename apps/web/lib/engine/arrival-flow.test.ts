import { binToHex, decodeTransaction, hexToBin, secp256k1 } from '@bitauth/libauth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type ArrivalTerms, arrivalContract } from '@/lib/bch/arrival/contract'
import { ROUTER_BUILD_FOR_CONTRACT_COIN } from '@/lib/bch/arrival/router-build.fixture'
import { buildArrivalReturn, completeArrivalTrade, FeeShortfallError } from '@/lib/bch/arrival/trade'
import { addressHistory, broadcast, listUnspent, rawTransaction, type Utxo } from '@/lib/bch/electrum'
import type { RouterBuild } from '@/lib/providers/cauldron'
import { ArrivalWaiting, contractCoins, finishArrival, returnArrival } from './arrival'
import type { SwapRecord, SwapStatus } from './swap'

/**
 * The swap contract's whole finish, end to end, on a real Cauldron Router build: the chain (Electrum) and the Router
 * are stand-ins, everything else is the real code, including the VM check of every transaction before it is sent.
 */

const router = vi.hoisted(() => ({ quote: vi.fn(), build: vi.fn() }))

vi.mock('@/lib/bch/electrum', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/bch/electrum')>()),
  listUnspent: vi.fn(),
  broadcast: vi.fn(),
  addressHistory: vi.fn(),
  rawTransaction: vi.fn(),
}))
vi.mock('@/lib/providers/cauldron', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/providers/cauldron')>()),
  getRouter: () => router,
}))
vi.mock('@/lib/bch/arrival/trade', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bch/arrival/trade')>()
  return { ...actual, completeArrivalTrade: vi.fn(actual.completeArrivalTrade) }
})

const PUSD = '2469acc5afa4b10cb5b5c04afb89c3a3ffd61c5da9c01e26d00951cae2a02544'
/** The fixture's PUSD and change go to the all-zero-hash address (a key nobody holds). */
const OWNER = `76a914${'00'.repeat(20)}88ac`
const TRADE_KEY = '11'.repeat(32)
const nowS = () => Math.floor(Date.now() / 1000)
const txid = (byte: string) => byte.repeat(32)

function publicKey(privateKey: string) {
  const pub = secp256k1.derivePublicKeyCompressed(hexToBin(privateKey))
  if (typeof pub === 'string') throw new Error(pub)
  return binToHex(pub)
}

/** The fixture's coin is 240,000 sats and buys 48 PUSD units; `promised` above that puts prices under the floor. */
function terms(promised = 48n, refundAfter = nowS() + 3600): ArrivalTerms {
  return {
    tokenCategory: PUSD,
    owner: OWNER,
    tradePublicKey: publicKey(TRADE_KEY),
    rateNum: promised.toString(),
    rateDen: '240000',
    refundAfter,
  }
}

function recordFor(t: ArrivalTerms, status: SwapStatus = 'bch-arrived'): SwapRecord {
  return {
    id: 'test',
    status,
    events: [],
    bchAsset: 'PUSD',
    addresses: { bchToken: 'bitcoincash:zowner', bchPlain: 'bitcoincash:qowner' },
    arrival: { terms: t, address: arrivalContract(t).address, tradeKey: TRADE_KEY },
  } as unknown as SwapRecord
}

/** The fixture's real Router build, funded from the contract's own coin (outpoint aa…aa:0). */
function buildFor(t: ArrivalTerms): RouterBuild {
  const fixture = structuredClone(ROUTER_BUILD_FOR_CONTRACT_COIN) as unknown as RouterBuild
  const ours = fixture.inputs_to_sign[0] as number
  const source = fixture.source_outputs[ours]
  if (!source) throw new Error('fixture has no source output for its funding input')
  fixture.source_outputs[ours] = {
    ...source,
    locking_script_hex: binToHex(arrivalContract(t).lockingBytecode),
  }
  return fixture
}

const coin = (value = 240_000n, id = txid('aa'), vout = 0): Utxo => ({ txid: id, vout, value, height: 0 })

function decoded(hex: string) {
  const tx = decodeTransaction(hexToBin(hex))
  if (typeof tx === 'string') throw new Error(tx)
  return tx
}

const log = () => {}

beforeEach(() => {
  for (const mock of [listUnspent, broadcast, addressHistory, rawTransaction]) vi.mocked(mock).mockReset()
  router.quote.mockReset().mockResolvedValue({ pools: 11 })
  router.build.mockReset()
})

describe('finishing a swap contract', () => {
  it('trades the contract’s coin with no wallet, paying the person at least the floor', async () => {
    const t = terms()
    vi.mocked(listUnspent).mockResolvedValue([coin()])
    router.build.mockResolvedValue(buildFor(t))
    vi.mocked(broadcast).mockResolvedValue(txid('cc'))

    const done = await finishArrival(recordFor(t), log)

    expect(done.status).toBe('completed')
    expect(done.cauldronTxid).toBe(txid('cc'))
    expect(BigInt(done.receivedAmount ?? 0)).toBeGreaterThanOrEqual(48n)
    const [build] = router.build.mock.calls[0] ?? []
    expect(build.minOutput).toBe(48n)
    expect(build.funding[0].scriptHex).toBe(binToHex(arrivalContract(t).lockingBytecode))
    const sent = decoded(vi.mocked(broadcast).mock.calls[0]?.[0] ?? '')
    // Pools' own outputs carry tokens too; the person's payout sits at the contract coin's index.
    const payout = sent.outputs[ROUTER_BUILD_FOR_CONTRACT_COIN.inputs_to_sign[0] as number]
    expect(binToHex(payout?.lockingBytecode ?? new Uint8Array())).toBe(OWNER)
    expect(payout?.token?.amount).toBeGreaterThanOrEqual(48n)
  })

  it('builds again with more held back when the miner fee comes up short', async () => {
    const t = terms()
    vi.mocked(listUnspent).mockResolvedValue([coin()])
    router.build.mockResolvedValue(buildFor(t))
    vi.mocked(broadcast).mockResolvedValue(txid('cc'))
    vi.mocked(completeArrivalTrade).mockImplementationOnce(() => {
      throw new FeeShortfallError(150n)
    })

    const done = await finishArrival(recordFor(t), log)

    expect(done.status).toBe('completed')
    expect(router.build).toHaveBeenCalledTimes(2)
    const [first, second] = router.build.mock.calls.map(([params]) => params.amount as bigint)
    expect(second).toBeLessThan(first as bigint)
  })

  it('waits while prices sit under the floor, before the refund time', async () => {
    const t = terms(1_000n)
    vi.mocked(listUnspent).mockResolvedValue([coin()])
    router.build.mockResolvedValue(buildFor(t))

    const waiting = await finishArrival(recordFor(t), log).catch((e: unknown) => e)

    expect(waiting).toBeInstanceOf(ArrivalWaiting)
    expect((waiting as ArrivalWaiting).reason).toBe('price')
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('sends the BCH back to the wallet once the refund time passes without a fair price', async () => {
    const t = terms(1_000n, nowS() - 60)
    vi.mocked(listUnspent).mockResolvedValue([coin()])
    router.build.mockResolvedValue(buildFor(t))
    vi.mocked(broadcast).mockResolvedValue(txid('dd'))

    const back = await finishArrival(recordFor(t), log)

    expect(back.status).toBe('bch-arrived')
    expect(back.arrival?.returnTxid).toBe(txid('dd'))
    const sent = decoded(vi.mocked(broadcast).mock.calls[0]?.[0] ?? '')
    expect(sent.outputs).toHaveLength(1)
    expect(binToHex(sent.outputs[0]?.lockingBytecode ?? new Uint8Array())).toBe(OWNER)
    expect(sent.outputs[0]?.token).toBeUndefined()
    expect(BigInt(back.bchSats ?? 0)).toBe(sent.outputs[0]?.valueSatoshis)
  })

  it('looks again from fresh pool state when another trade took a pool first', async () => {
    const t = terms()
    vi.mocked(listUnspent).mockResolvedValue([coin()])
    router.build.mockResolvedValue(buildFor(t))
    vi.mocked(broadcast)
      .mockRejectedValueOnce(new Error('txn-mempool-conflict'))
      .mockResolvedValue(txid('cc'))

    const done = await finishArrival(recordFor(t), log)

    expect(done.status).toBe('completed')
    expect(router.build).toHaveBeenCalledTimes(2)
  })

  it('sends a second coin from the bridge to the wallet after trading the largest', async () => {
    const t = terms()
    vi.mocked(listUnspent).mockResolvedValue([coin(50_000n, txid('bb'), 3), coin()])
    router.build.mockResolvedValue(buildFor(t))
    vi.mocked(broadcast).mockResolvedValueOnce(txid('cc')).mockResolvedValueOnce(txid('dd'))

    const done = await finishArrival(recordFor(t), log)

    expect(done.status).toBe('completed')
    expect(broadcast).toHaveBeenCalledTimes(2)
    const release = decoded(vi.mocked(broadcast).mock.calls[1]?.[0] ?? '')
    expect(binToHex(release.inputs[0]?.outpointTransactionHash ?? new Uint8Array())).toBe(txid('bb'))
    expect(release.inputs[0]?.outpointIndex).toBe(3)
  })

  it('waits for the BCH when nothing has landed at the contract yet', async () => {
    vi.mocked(listUnspent).mockResolvedValue([])
    vi.mocked(addressHistory).mockResolvedValue([])

    const waiting = await finishArrival(recordFor(terms()), log).catch((e: unknown) => e)

    expect(waiting).toBeInstanceOf(ArrivalWaiting)
    expect((waiting as ArrivalWaiting).reason).toBe('coin')
  })
})

describe('reading what already left the contract', () => {
  it('finds a trade sent from another tab, with what it paid', async () => {
    const t = terms()
    const trade = completeArrivalTrade({
      build: buildFor(t),
      contract: arrivalContract(t),
      terms: t,
      tradePrivateKey: TRADE_KEY,
    })
    vi.mocked(listUnspent).mockResolvedValue([])
    vi.mocked(addressHistory).mockResolvedValue([
      { txid: txid('01'), height: 1 },
      { txid: txid('ee'), height: 2 },
    ])
    // The bridge's payout into the contract spends nothing of the contract's; only the trade does.
    vi.mocked(rawTransaction).mockImplementation(async (id) =>
      id === txid('ee') ? trade.hex : ROUTER_BUILD_FOR_CONTRACT_COIN.unsigned_tx_hex,
    )

    const done = await finishArrival(recordFor(t), log)

    expect(done.status).toBe('completed')
    expect(done.cauldronTxid).toBe(txid('ee'))
    expect(done.receivedAmount).toBe(trade.received.toString())
  })

  it('finds a return sent earlier, and marks the swap as back in the wallet', async () => {
    const t = terms()
    const contract = arrivalContract(t)
    const back = buildArrivalReturn({
      contract,
      terms: t,
      coin: coin(),
      how: 'release',
      tradePrivateKey: TRADE_KEY,
    })
    vi.mocked(listUnspent).mockResolvedValue([])
    vi.mocked(addressHistory).mockResolvedValue([{ txid: txid('dd'), height: 2 }])
    vi.mocked(rawTransaction).mockResolvedValue(back.hex)

    const done = await returnArrival(recordFor(t), log)

    expect(done.status).toBe('bch-arrived')
    expect(done.arrival?.returnTxid).toBe(txid('dd'))
  })
})

describe('sending the BCH back', () => {
  it('keeps a finished swap finished when late BCH goes back', async () => {
    const t = terms()
    vi.mocked(listUnspent).mockResolvedValue([coin(60_000n, txid('bb'))])
    vi.mocked(broadcast).mockResolvedValue(txid('ff'))

    const done = await returnArrival(recordFor(t, 'completed'), log)

    expect(done.status).toBe('completed')
    expect(done.arrival?.returnTxid).toBe(txid('ff'))
    expect(done.events.at(-1)?.note).toMatch(/more sats went back/)
  })

  it('leaves a finished swap alone when the contract is empty', async () => {
    const record = recordFor(terms(), 'completed')
    vi.mocked(listUnspent).mockResolvedValue([])

    expect(await returnArrival(record, log)).toBe(record)
  })

  it('sends every coin it can when one of them fails, and fails only if none goes', async () => {
    const t = terms()
    vi.mocked(listUnspent).mockResolvedValue([coin(), coin(50_000n, txid('bb'))])
    vi.mocked(broadcast).mockRejectedValueOnce(new Error('missing inputs')).mockResolvedValueOnce(txid('dd'))

    const back = await returnArrival(recordFor(t), log)
    expect(back.bchTxid).toBe(txid('dd'))
    expect(back.arrival?.returnTxid).toBe(txid('dd'))

    vi.mocked(broadcast).mockReset().mockRejectedValue(new Error('missing inputs'))
    await expect(returnArrival(recordFor(t), log)).rejects.toThrow('missing inputs')
  })

  it('counts only plain BCH coins big enough to send back, largest first', async () => {
    const t = terms()
    vi.mocked(listUnspent).mockResolvedValue([
      coin(500n, txid('01')),
      { ...coin(300_000n, txid('02')), token: { category: PUSD, amount: 5n } },
      coin(2_000n, txid('03')),
      coin(9_000n, txid('04')),
    ])

    const coins = await contractCoins(recordFor(t).arrival as NonNullable<SwapRecord['arrival']>)

    expect(coins.map((c) => c.value)).toEqual([9_000n, 2_000n])
  })
})
