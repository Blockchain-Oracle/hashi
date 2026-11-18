import { binToHex, hexToBin, secp256k1, type TransactionCommon } from '@bitauth/libauth'
import { asmToBytecode } from '@cashscript/utils'
import { compileFile } from 'cashc'
import { Contract, MockNetworkProvider, SignatureTemplate } from 'cashscript'
import { describe, expect, it } from 'vitest'
import type { RouterBuild } from '@/lib/providers/cauldron'
import {
  type ArrivalTerms,
  arrivalContract,
  arrivalFloor,
  unlockRelease,
  unlockSwap,
  vmCategory,
} from './contract'
import { ROUTER_BUILD_FOR_CONTRACT_COIN } from './router-build.fixture'
import artifact from './swap-on-arrival.artifact.json'
import { BelowFloorError, buildArrivalReturn, completeArrivalTrade } from './trade'
import { verifyInVm } from './vm'

const SOURCE = new URL('../../../contracts/swap-on-arrival.cash', import.meta.url)
const PUSD = '2469acc5afa4b10cb5b5c04afb89c3a3ffd61c5da9c01e26d00951cae2a02544'
/** The address the fixture's PUSD and change go to: the all-zero hash (a key nobody holds). */
const OWNER = `76a914${'00'.repeat(20)}88ac`
const STRANGER = `76a914${'11'.repeat(20)}88ac`
const TRADE_KEY = '11'.repeat(32)
const OTHER_KEY = '22'.repeat(32)
const REFUND_AFTER = 1_800_000_000

function publicKey(privateKey: string) {
  const pub = secp256k1.derivePublicKeyCompressed(hexToBin(privateKey))
  if (typeof pub === 'string') throw new Error(pub)
  return binToHex(pub)
}

/** Terms promising `promised` PUSD units for a 240,000-sat payout (the fixture's coin buys 48 units). */
function terms(promised = 48n): ArrivalTerms {
  return {
    tokenCategory: PUSD,
    owner: OWNER,
    tradePublicKey: publicKey(TRADE_KEY),
    rateNum: promised.toString(),
    rateDen: '240000',
    refundAfter: REFUND_AFTER,
  }
}

/** The fixture's real Router build, with its funding coin moved onto `contract`'s address. */
function buildFor(lockingBytecode: Uint8Array): RouterBuild {
  const fixture = structuredClone(ROUTER_BUILD_FOR_CONTRACT_COIN) as unknown as RouterBuild
  const ours = fixture.inputs_to_sign[0] as number
  const source = fixture.source_outputs[ours]
  if (!source) throw new Error('fixture has no source output for its funding input')
  fixture.source_outputs[ours] = { ...source, locking_script_hex: binToHex(lockingBytecode) }
  return fixture
}

const COIN = { txid: 'bb'.repeat(32), vout: 1, value: 240_000n }

/** The SDK's unlocker for a function (typed as possibly missing, since the artifact is read at run time). */
function sdkUnlock(sdk: Contract, name: string) {
  const unlock = (
    sdk.unlock as Record<
      string,
      ((...args: unknown[]) => { generateUnlockingBytecode: (c: unknown) => Uint8Array }) | undefined
    >
  )[name]
  if (!unlock) throw new Error(`The SDK has no ${name} unlocker`)
  return unlock
}

describe('swap-on-arrival contract', () => {
  it('the committed artifact matches the contract source', () => {
    const compiled = compileFile(SOURCE)
    expect(artifact.bytecodeHex).toBe(binToHex(asmToBytecode(compiled.bytecode)))
    expect(artifact.constructorInputs).toEqual(compiled.constructorInputs)
    expect(artifact.abi).toEqual(compiled.abi)
  })

  it('encodes exactly as the CashScript SDK does', () => {
    const t = terms()
    const ours = arrivalContract(t)
    const sdk = new Contract(
      compileFile(SOURCE),
      [vmCategory(PUSD), hexToBin(OWNER), hexToBin(t.tradePublicKey), 48n, 240_000n, BigInt(REFUND_AFTER)],
      { provider: new MockNetworkProvider(), contractType: 'p2sh20' },
    )
    expect(binToHex(ours.redeemScript)).toBe(sdk.bytecode)
    expect(binToHex(ours.lockingBytecode)).toBe(sdk.lockingBytecode)
    expect(ours.address.startsWith('bitcoincash:p')).toBe(true)

    // Same unlocks, signature included, on the real trade.
    const trade = completeArrivalTrade({
      build: buildFor(ours.lockingBytecode),
      contract: ours,
      terms: t,
      tradePrivateKey: TRADE_KEY,
    })
    const index = ROUTER_BUILD_FOR_CONTRACT_COIN.inputs_to_sign[0] as number
    const context = { inputIndex: index, sourceOutputs: trade.sourceOutputs, transaction: trade.transaction }
    expect(binToHex(unlockSwap(ours, context, TRADE_KEY))).toBe(
      binToHex(
        sdkUnlock(sdk, 'swap')(new SignatureTemplate(hexToBin(TRADE_KEY))).generateUnlockingBytecode(context),
      ),
    )
    const back = buildArrivalReturn({
      contract: ours,
      terms: t,
      coin: COIN,
      how: 'release',
      tradePrivateKey: TRADE_KEY,
    })
    const backContext = { inputIndex: 0, sourceOutputs: back.sourceOutputs, transaction: back.transaction }
    expect(binToHex(unlockRelease(ours, backContext, TRADE_KEY))).toBe(
      binToHex(
        sdkUnlock(
          sdk,
          'release',
        )(new SignatureTemplate(hexToBin(TRADE_KEY))).generateUnlockingBytecode(backContext),
      ),
    )
  })
})

describe('the Cauldron trade from the contract (the real Router build, in the 2026 VM)', () => {
  const t = terms()
  const contract = arrivalContract(t)
  const trade = completeArrivalTrade({
    build: buildFor(contract.lockingBytecode),
    contract,
    terms: t,
    tradePrivateKey: TRADE_KEY,
  })
  const ours = ROUTER_BUILD_FOR_CONTRACT_COIN.inputs_to_sign[0] as number
  // The Router puts the bought tokens at the funding coin's own index, which is where the contract checks.
  const outIndex = ours

  /** The finished trade with a change, re-signed by `key` so only that change is under test. */
  function altered(change: (tx: TransactionCommon) => void, key = TRADE_KEY) {
    const transaction = structuredClone(trade.transaction)
    change(transaction)
    const context = { inputIndex: ours, sourceOutputs: trade.sourceOutputs, transaction }
    const input = transaction.inputs[ours]
    if (!input) throw new Error('no input')
    transaction.inputs[ours] = { ...input, unlockingBytecode: unlockSwap(contract, context, key) }
    return verifyInVm(transaction, trade.sourceOutputs)
  }

  it('is valid, pays the person at least the floor, and pays at least 1 sat per byte', () => {
    expect(verifyInVm(trade.transaction, trade.sourceOutputs)).toBe(true)
    expect(trade.received).toBeGreaterThanOrEqual(trade.floor)
    expect(trade.floor).toBe(48n)
    expect(trade.fee).toBeGreaterThanOrEqual(BigInt(trade.size))
  })

  it('promises the review\u2019s amount, and pro rata only for a smaller coin', () => {
    expect(arrivalFloor(terms(), 240_000n)).toBe(48n)
    expect(arrivalFloor(terms(), 300_000n)).toBe(48n)
    expect(arrivalFloor(terms(), 120_000n)).toBe(24n)
  })

  it('refuses to sign a trade under the floor', () => {
    expect(() =>
      completeArrivalTrade({
        build: buildFor(arrivalContract(terms(60n)).lockingBytecode),
        contract: arrivalContract(terms(60n)),
        terms: terms(60n),
        tradePrivateKey: TRADE_KEY,
      }),
    ).toThrow(BelowFloorError)
  })

  it('rejects a second contract coin riding on the first coin\u2019s payout (double satisfaction)', () => {
    // The finished trade, plus a second 240,000-sat coin of the same contract and an output taking it. The second
    // coin's own index holds the BCH change, not a PUSD payout to the person, so the contract refuses it.
    const transaction = structuredClone(trade.transaction)
    const sourceOutputs = [
      ...trade.sourceOutputs,
      { lockingBytecode: contract.lockingBytecode, valueSatoshis: 240_000n },
    ]
    const second = transaction.inputs.length
    transaction.inputs.push({
      outpointTransactionHash: hexToBin('dd'.repeat(32)),
      outpointIndex: 0,
      sequenceNumber: 0xffffffff,
      unlockingBytecode: new Uint8Array(),
    })
    transaction.outputs.push({ lockingBytecode: hexToBin(STRANGER), valueSatoshis: 239_000n })
    for (const index of [ours, second]) {
      const context = { inputIndex: index, sourceOutputs, transaction }
      const input = transaction.inputs[index]
      if (input)
        transaction.inputs[index] = { ...input, unlockingBytecode: unlockSwap(contract, context, TRADE_KEY) }
    }
    // Refused by the second coin's own check, not by anything else in the transaction.
    expect(String(verifyInVm(transaction, sourceOutputs))).toContain(`input index ${second}`)
  })

  it('rejects the PUSD paid to anyone else', () => {
    const result = altered((tx) => {
      const out = tx.outputs[outIndex]
      if (out) tx.outputs[outIndex] = { ...out, lockingBytecode: hexToBin(STRANGER) }
    })
    expect(result).not.toBe(true)
  })

  it('rejects one unit under the floor', () => {
    const result = altered((tx) => {
      const out = tx.outputs[outIndex]
      if (out?.token) tx.outputs[outIndex] = { ...out, token: { ...out.token, amount: trade.floor - 1n } }
    })
    expect(result).not.toBe(true)
  })

  it('rejects a signature from any key but the trade key', () => {
    expect(altered(() => {}, OTHER_KEY)).not.toBe(true)
  })

  it('rejects a changed transaction under the old signature', () => {
    const transaction = structuredClone(trade.transaction)
    const last = transaction.outputs.length - 1
    const change = transaction.outputs[last]
    if (change) transaction.outputs[last] = { ...change, valueSatoshis: change.valueSatoshis - 100n }
    expect(verifyInVm(transaction, trade.sourceOutputs)).not.toBe(true)
  })
})

describe('the BCH back to the person', () => {
  const t = terms()
  const contract = arrivalContract(t)

  it('release: valid with the trade key, rejected with any other or to anyone else', () => {
    const back = buildArrivalReturn({
      contract,
      terms: t,
      coin: COIN,
      how: 'release',
      tradePrivateKey: TRADE_KEY,
    })
    expect(verifyInVm(back.transaction, back.sourceOutputs)).toBe(true)
    expect(back.transaction.outputs[0]?.valueSatoshis).toBe(COIN.value - back.fee)
    expect(back.fee).toBeLessThan(3000n)
    const wrongKey = buildArrivalReturn({
      contract,
      terms: t,
      coin: COIN,
      how: 'release',
      tradePrivateKey: OTHER_KEY,
    })
    expect(verifyInVm(wrongKey.transaction, wrongKey.sourceOutputs)).not.toBe(true)
    const elsewhere = buildArrivalReturn({
      contract,
      terms: { ...t, owner: STRANGER },
      coin: COIN,
      how: 'release',
      tradePrivateKey: TRADE_KEY,
    })
    // Built against a stranger as "owner", but spending this contract's coin: the contract still names the person.
    elsewhere.sourceOutputs[0] = { lockingBytecode: contract.lockingBytecode, valueSatoshis: COIN.value }
    expect(verifyInVm(elsewhere.transaction, elsewhere.sourceOutputs)).not.toBe(true)
  })

  it('reclaim: valid after the refund time with no signature, rejected before it or with a fee over the cap', () => {
    const back = buildArrivalReturn({ contract, terms: t, coin: COIN, how: 'reclaim' })
    expect(back.transaction.locktime).toBe(REFUND_AFTER)
    expect(verifyInVm(back.transaction, back.sourceOutputs)).toBe(true)

    const early = structuredClone(back.transaction)
    early.locktime = REFUND_AFTER - 1
    expect(verifyInVm(early, back.sourceOutputs)).not.toBe(true)

    const greedy = structuredClone(back.transaction)
    const out = greedy.outputs[0]
    if (out) greedy.outputs[0] = { ...out, valueSatoshis: COIN.value - 3001n }
    expect(verifyInVm(greedy, back.sourceOutputs)).not.toBe(true)
  })
})
