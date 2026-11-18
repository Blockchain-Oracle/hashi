import { rm } from 'node:fs/promises'
import { binToHex, decodeTransaction, hexToBin, secp256k1 } from '@bitauth/libauth'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { type ArrivalTerms, arrivalContract } from '@/lib/bch/arrival/contract'
import { listArrivals, saveArrival, storeOnVolume } from '@/lib/bch/arrival/store.server'
import { addressHistory, broadcast, listUnspent, type Utxo } from '@/lib/bch/electrum'
import { POST as register } from './route'
import { POST as sweep } from './sweep/route'

/**
 * The keeper's two endpoints on a real store in a temporary folder; only the chain (Electrum) is a stand-in. Every
 * reclaim the sweep sends is checked in the VM by the route itself before it goes out.
 */

const env = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? '/tmp'}/hashi-keeper-test-${process.pid}-${Date.now()}`
  const token = 'keeper-test-token-0123456789abcdef'
  process.env.ARRIVAL_STORE_DIR = dir
  process.env.ARRIVAL_SWEEP_TOKEN = token
  return { dir, token }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/bch/electrum', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/bch/electrum')>()),
  listUnspent: vi.fn(),
  broadcast: vi.fn(),
  addressHistory: vi.fn(),
}))
// A developer's machine and CI have no mounted volume for the store; production's is checked for real.
vi.mock('@/lib/bch/arrival/store.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/bch/arrival/store.server')>()),
  storeOnVolume: vi.fn(async () => true),
}))

const PUSD = '2469acc5afa4b10cb5b5c04afb89c3a3ffd61c5da9c01e26d00951cae2a02544'
const OWNER = `76a914${'00'.repeat(20)}88ac`
const nowS = () => Math.floor(Date.now() / 1000)
const DAY_S = 24 * 60 * 60

let keyByte = 0x10
function terms(refundAfter = nowS() + 3600): ArrivalTerms {
  keyByte++
  const pub = secp256k1.derivePublicKeyCompressed(hexToBin(keyByte.toString(16).padStart(2, '0').repeat(32)))
  if (typeof pub === 'string') throw new Error(pub)
  return {
    tokenCategory: PUSD,
    owner: OWNER,
    tradePublicKey: binToHex(pub),
    rateNum: '48',
    rateDen: '240000',
    refundAfter,
  }
}

let ip = 0
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://hashi.test/api/arrivals', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ip}`, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
const keeper = (token = env.token) => post({}, { authorization: `Bearer ${token}` })

async function stored(t: ArrivalTerms) {
  const { address } = arrivalContract(t)
  await saveArrival({ address, terms: t, createdAt: Date.now() })
  return address
}

const coin = (value: bigint, id = 'aa'.repeat(32)): Utxo => ({ txid: id, vout: 0, value, height: 1 })

beforeEach(async () => {
  await rm(env.dir, { recursive: true, force: true })
  for (const mock of [listUnspent, broadcast, addressHistory]) vi.mocked(mock).mockReset()
  vi.mocked(listUnspent).mockResolvedValue([])
  vi.mocked(addressHistory).mockResolvedValue([])
})
afterAll(() => rm(env.dir, { recursive: true, force: true }))

describe('POST /api/arrivals', () => {
  it('pauses swap contracts until the keeper has run', async () => {
    const response = await register(post({ terms: terms() }))
    expect(response.status).toBe(503)
    expect((await response.json()).error).toMatch(/keeper has not run/)
  })

  it('keeps the terms under the address worked out from them, never one sent with them', async () => {
    expect((await sweep(keeper())).status).toBe(200)
    const t = terms()
    const response = await register(
      post({ terms: t, address: 'bitcoincash:pzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' }),
    )
    expect(response.status).toBe(200)
    const { address } = await response.json()
    expect(address).toBe(arrivalContract(t).address)
    expect((await listArrivals()).map((a) => a.address)).toEqual([address])
  })

  it('refuses junk, foreign tokens and refund times out of range', async () => {
    await sweep(keeper())
    expect((await register(post('not json'))).status).toBe(400)
    expect((await register(post({ terms: { ...terms(), owner: 'zz' } }))).status).toBe(400)
    expect((await register(post({ terms: { ...terms(), tokenCategory: 'ab'.repeat(32) } }))).status).toBe(400)
    expect((await register(post({ terms: terms(nowS() + 4 * 3600) }))).status).toBe(400)
    expect((await register(post({ terms: terms(nowS() - 10) }))).status).toBe(400)
    expect(await listArrivals()).toEqual([])
  })

  it('pauses when the store is not on a persistent volume', async () => {
    await sweep(keeper())
    vi.mocked(storeOnVolume).mockResolvedValueOnce(false)
    const response = await register(post({ terms: terms() }))
    expect(response.status).toBe(503)
    expect((await response.json()).error).toMatch(/persistent volume/)
  })
})

describe('POST /api/arrivals/sweep', () => {
  it('answers only the keeper’s token', async () => {
    expect((await sweep(post({}))).status).toBe(401)
    expect((await sweep(keeper('wrong'))).status).toBe(401)
    // Same length in characters, not in bytes: refused, never thrown.
    expect((await sweep(keeper(`${env.token.slice(0, -1)}é`))).status).toBe(401)
  })

  it('sends a coin past its refund time back to its owner, and leaves dust alone', async () => {
    const t = terms(nowS() - 60)
    const address = await stored(t)
    vi.mocked(listUnspent).mockResolvedValue([coin(240_000n), coin(600n, 'bb'.repeat(32))])
    vi.mocked(broadcast).mockResolvedValue('cc'.repeat(32))

    const { report } = await (await sweep(keeper())).json()

    expect(report).toEqual([{ address, result: `returned 240000 sats: ${'cc'.repeat(32)}` }])
    expect(broadcast).toHaveBeenCalledTimes(1)
    const sent = decodeTransaction(hexToBin(vi.mocked(broadcast).mock.calls[0]?.[0] ?? ''))
    if (typeof sent === 'string') throw new Error(sent)
    expect(sent.locktime).toBe(t.refundAfter)
    expect(sent.outputs).toHaveLength(1)
    expect(binToHex(sent.outputs[0]?.lockingBytecode ?? new Uint8Array())).toBe(OWNER)
  })

  it('leaves contracts before their refund time alone', async () => {
    await stored(terms())
    vi.mocked(listUnspent).mockResolvedValue([coin(240_000n)])

    const { report } = await (await sweep(keeper())).json()

    expect(report).toEqual([])
    expect(listUnspent).not.toHaveBeenCalled()
  })

  it('tries again next run while the chain’s clock is behind the refund time', async () => {
    const address = await stored(terms(nowS() - 60))
    vi.mocked(listUnspent).mockResolvedValue([coin(240_000n)])
    vi.mocked(broadcast).mockRejectedValue(
      new Error('the transaction was rejected by network rules. non-final'),
    )

    const { report } = await (await sweep(keeper())).json()

    expect(report).toEqual([{ address, result: 'not final yet' }])
    expect(await listArrivals()).toHaveLength(1)
  })

  it('forgets a contract never paid a day after its refund time, and an emptied one only after a week', async () => {
    const unpaid = await stored(terms(nowS() - DAY_S - 60))
    const emptied = await stored(terms(nowS() - DAY_S - 120))
    vi.mocked(addressHistory).mockImplementation(async (address) =>
      address === emptied ? [{ txid: 'dd'.repeat(32), height: 1 }] : [],
    )

    const { report } = await (await sweep(keeper())).json()

    expect(report).toEqual([{ address: unpaid, result: 'forgotten (never paid)' }])
    expect((await listArrivals()).map((a) => a.address)).toEqual([emptied])
  })

  it('runs one sweep at a time', async () => {
    await stored(terms(nowS() - 60))
    let release: (coins: Utxo[]) => void = () => {}
    vi.mocked(listUnspent).mockReturnValue(new Promise((resolve) => (release = resolve)))

    const first = sweep(keeper())
    await vi.waitFor(() => expect(listUnspent).toHaveBeenCalled())
    expect((await sweep(keeper())).status).toBe(409)
    release([])
    expect((await first).status).toBe(200)
    expect((await sweep(keeper())).status).toBe(200)
  })
})
