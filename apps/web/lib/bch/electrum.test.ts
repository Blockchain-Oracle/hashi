import { binToHex, hash256, hexToBin } from '@bitauth/libauth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Failing over between Electrum servers, with a stand-in for the library's client: each server can refuse to
 * connect, drop its connection, or answer a request its own way.
 */

const net = vi.hoisted(() => {
  type Answer = (method: string, params: unknown[]) => unknown
  const answers = new Map<string, Answer>()
  const refusing = new Set<string>()
  const made: FakeClient[] = []
  class FakeClient {
    status = 0
    chainHeight = 0
    disconnected = false
    subscriptions: string[] = []
    readonly hostIdentifier: string
    constructor(_application: string, _version: string, host: string) {
      this.hostIdentifier = host
      made.push(this)
    }
    async connect() {
      if (refusing.has(this.hostIdentifier)) throw new Error('refused')
      this.status = 1
    }
    async request(method: string, ...params: unknown[]) {
      if (this.status !== 1) {
        throw new Error(`Unable to send request to a disconnected server '${this.hostIdentifier}'.`)
      }
      const answer = answers.get(this.hostIdentifier)
      return answer ? answer(method, params) : `${this.hostIdentifier} ${method}`
    }
    on() {
      return this
    }
    async subscribe(method: string, ...params: unknown[]) {
      this.subscriptions.push(`${method} ${params.join(',')}`)
    }
    async unsubscribe() {
      return true
    }
    async disconnect() {
      this.disconnected = true
      this.status = 0
      return true
    }
  }
  return { answers, refusing, made, FakeClient }
})

vi.mock('@electrum-cash/network', () => ({
  ElectrumClient: net.FakeClient,
  ConnectionStatus: { CONNECTED: 1 },
}))

/** A fresh copy of the module (its connection is module state), in front of servers that all work. */
async function fresh() {
  vi.resetModules()
  return import('./electrum')
}

const FIRST = 'bch.imaginary.cash'
const SECOND = 'electrum.imaginary.cash'

beforeEach(() => {
  net.answers.clear()
  net.refusing.clear()
  net.made.length = 0
})

describe('Electrum failover', () => {
  it('leaves a server that dropped the connection, and sends the request to the next one', async () => {
    const electrum = await fresh()
    expect(await electrum.rawTransaction('ab')).toBe(`${FIRST} blockchain.transaction.get`)

    const first = net.made[0]
    if (!first) throw new Error('no client')
    first.status = 0 // dropped; the library would keep retrying this same server

    expect(await electrum.rawTransaction('ab')).toBe(`${SECOND} blockchain.transaction.get`)
    expect(first.disconnected).toBe(true)
    expect(electrum.electrumHost()).toBe(SECOND)
  })

  it('sends a request again when the connection dropped while it waited for the answer', async () => {
    net.answers.set(FIRST, () => new Error('Connection lost'))
    const electrum = await fresh()

    expect(await electrum.rawTransaction('ab')).toBe(`${SECOND} blockchain.transaction.get`)
  })

  it('gives back the server’s own refusal as it is, without trying elsewhere', async () => {
    net.answers.set(
      FIRST,
      () => new Error('the transaction was rejected by network rules. bad-txns-inputs-missingorspent'),
    )
    const electrum = await fresh()

    await expect(electrum.broadcast('deadbeef')).rejects.toThrow('missingorspent')
    expect(net.made).toHaveLength(1)
  })

  it('counts a broadcast as sent when the retry finds the node already has it', async () => {
    net.answers.set(FIRST, () => new Error('Connection lost'))
    net.answers.set(
      SECOND,
      () => new Error('the transaction was rejected by network rules.\n\ntxn-already-known (code 18)'),
    )
    const electrum = await fresh()

    expect(await electrum.broadcast('deadbeef')).toBe(binToHex(hash256(hexToBin('deadbeef')).reverse()))
  })

  it('skips a server that does not answer when connecting', async () => {
    net.refusing.add(FIRST)
    const electrum = await fresh()

    expect(await electrum.rawTransaction('ab')).toBe(`${SECOND} blockchain.transaction.get`)
  })

  it('moves address subscriptions to the next server, and says to look again once', async () => {
    const electrum = await fresh()
    const onChange = vi.fn()
    await electrum.subscribeAddress('bitcoincash:qowner', onChange)
    expect(onChange).not.toHaveBeenCalled()

    const first = net.made[0]
    if (!first) throw new Error('no client')
    first.status = 0
    await electrum.rawTransaction('ab')

    expect(net.made[1]?.subscriptions).toEqual(['blockchain.address.subscribe bitcoincash:qowner'])
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('says plainly when no server can be reached', async () => {
    for (const host of [FIRST, SECOND, 'cashnode.bch.ninja', 'fulcrum.greyh.at', 'bch.loping.net'])
      net.refusing.add(host)
    const electrum = await fresh()

    await expect(electrum.rawTransaction('ab')).rejects.toThrow(/could not reach the Bitcoin Cash network/)
  })

  it('stops after three servers when every connection drops', async () => {
    for (const host of [FIRST, SECOND, 'cashnode.bch.ninja'])
      net.answers.set(host, () => new Error('Connection lost'))
    const electrum = await fresh()

    await expect(electrum.rawTransaction('ab')).rejects.toThrow(/could not reach the Bitcoin Cash network/)
    expect(net.made).toHaveLength(3)
  })
})
