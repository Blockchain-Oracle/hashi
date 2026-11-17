import { binToHex, decodeTransaction, hexToBin } from '@bitauth/libauth'
import { describe, expect, it } from 'vitest'
import { DUST_SATS, lockingBytecode, opReturnScript, planPayment } from './tx'
import type { WalletAddress, WalletUtxo } from './wallet'

const ADDRESS: WalletAddress = {
  path: 'receive',
  index: 0,
  plain: 'bitcoincash:qpk3zrsl6nlxm9mr8au8fenn932sjw0m8y4pnsakyk',
  token: 'bitcoincash:zpk3zrsl6nlxm9mr8au8fenn932sjw0m8yjtqwnsm9',
  lockingHex: '76a9146d110e1fd4fe6d97633f7874e6732c550939fb3988ac',
}
// NEAR Intents' published BCH treasury address, used here only as a well-formed payee.
const VAULT = 'bitcoincash:qrdd5m5s72wzs4u373ux2fcpn02hw00u7v9wr8cex8'

function coin(value: bigint, vout = 0, token?: WalletUtxo['token']): WalletUtxo {
  return {
    txid: 'ab'.repeat(32),
    vout,
    value,
    height: 1,
    address: ADDRESS,
    ...(token ? { token } : {}),
  }
}

function decode(hex: string) {
  const tx = decodeTransaction(hexToBin(hex))
  if (typeof tx === 'string') throw new Error(tx)
  return tx
}

describe('BCH payments', () => {
  it('derives the same locking script the wallet layer uses', () => {
    expect(binToHex(lockingBytecode(ADDRESS.plain))).toBe(ADDRESS.lockingHex)
  })

  it('builds a THORChain deposit: vault at output 0, memo next, change back to input 0', () => {
    const memo = '=:BASE.USDC:0x0000000000000000000000000000000000000001:9800000'
    const plan = planPayment({
      coins: [coin(1_000_000n)],
      payments: [{ address: VAULT, value: 500_000n }],
      memo,
    })
    const tx = decode(plan.hex)
    expect(tx.outputs[0]?.valueSatoshis).toBe(500_000n)
    expect(binToHex(tx.outputs[0]?.lockingBytecode ?? new Uint8Array())).toBe(
      binToHex(lockingBytecode(VAULT)),
    )
    expect(tx.outputs[1]?.lockingBytecode[0]).toBe(0x6a)
    expect(tx.outputs[1]?.valueSatoshis).toBe(0n)
    expect(binToHex(tx.outputs[2]?.lockingBytecode ?? new Uint8Array())).toBe(ADDRESS.lockingHex)
    expect(tx.inputs[0]?.sequenceNumber).toBe(0xffffffff)
    expect(plan.feeSats + plan.changeSats + 500_000n).toBe(1_000_000n)
  })

  it('pays about one sat per signed byte', () => {
    const plan = planPayment({ coins: [coin(1_000_000n)], payments: [{ address: VAULT, value: 100_000n }] })
    expect(plan.feeSats).toBe(plan.sizeBytes)
    expect(plan.feeSats).toBeGreaterThan(200n)
    expect(plan.feeSats).toBeLessThan(260n)
  })

  it('puts a coin at the requested address first, so a THORChain refund comes back there', () => {
    const other: WalletAddress = {
      ...ADDRESS,
      index: 1,
      plain: VAULT,
      lockingHex: binToHex(lockingBytecode(VAULT)),
    }
    const bigger = { ...coin(5_000_000n, 1), address: other }
    const plan = planPayment({
      coins: [bigger, coin(400_000n, 2)],
      payments: [{ address: VAULT, value: 100_000n }],
      first: ADDRESS.plain,
    })
    expect(plan.coins[0]?.address.plain).toBe(ADDRESS.plain)
    const tx = decode(plan.hex)
    expect(binToHex(tx.outputs.at(-1)?.lockingBytecode ?? new Uint8Array())).toBe(ADDRESS.lockingHex)
  })

  it('never spends a coin that carries tokens', () => {
    const tokenCoin = coin(5_000_000n, 1, { category: 'cd'.repeat(32), amount: 100n })
    const plan = planPayment({
      coins: [tokenCoin, coin(300_000n, 2)],
      payments: [{ address: VAULT, value: 100_000n }],
    })
    expect(plan.coins.map((c) => c.vout)).toEqual([2])
  })

  it('leaves change below dust to the miner', () => {
    const plan = planPayment({ coins: [coin(100_500n)], payments: [{ address: VAULT, value: 100_000n }] })
    expect(plan.changeSats).toBe(0n)
    expect(decode(plan.hex).outputs).toHaveLength(1)
    expect(plan.feeSats).toBeLessThan(DUST_SATS)
  })

  it('refuses a memo over 80 bytes and a payment it cannot afford', () => {
    expect(() => opReturnScript('x'.repeat(81))).toThrow()
    expect(() =>
      planPayment({ coins: [coin(1_000n)], payments: [{ address: VAULT, value: 900n }] }),
    ).toThrow()
  })
})
