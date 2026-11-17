import { describe, expect, it } from 'vitest'
import { STABLES } from '@/lib/constants/assets'
import {
  cleanAmount,
  INITIAL_STATE,
  type PickedAsset,
  paramsFromState,
  type Side,
  type SwapState,
  sidesOf,
  stateFromParams,
  swapReducer,
} from './state'

const usdtEth = STABLES.find((s) => s.symbol === 'USDT' && s.chain === 'ethereum')
const usdcSol = STABLES.find((s) => s.symbol === 'USDC' && s.chain === 'solana')
if (!usdtEth || !usdcSol) throw new Error('fixture')

const pick = (state: SwapState, side: Side, asset: PickedAsset) =>
  swapReducer(state, { type: 'pick', side, asset })

/** The default pair is USDC on Base → PUSD. */
describe('swap state', () => {
  it('keeps a stablecoin picked against a stablecoin, and puts Bitcoin Cash on the other side with a notice', () => {
    const next = pick({ ...INITIAL_STATE, amount: '25' }, 'receive', { kind: 'stable', stable: usdtEth })
    // The pick stays where it was made; the other side becomes PUSD (it was on screen).
    expect(sidesOf(next).receive).toEqual({ kind: 'stable', stable: usdtEth })
    expect(sidesOf(next).pay).toEqual({ kind: 'bch', id: 'PUSD' })
    expect(next.direction).toBe('out')
    expect(next.notice).toMatch(/You pay is now PUSD/)
    // PUSD is about a dollar, like USDC was, so the typed amount still means the same.
    expect(next.amount).toBe('25')
  })

  it('pays BCH for PUSD on Bitcoin Cash alone, instead of turning the swap around', () => {
    const next = pick({ ...INITIAL_STATE, amount: '25' }, 'pay', { kind: 'bch', id: 'BCH' })
    expect(next.direction).toBe('local')
    expect(sidesOf(next)).toEqual({ pay: { kind: 'bch', id: 'BCH' }, receive: { kind: 'bch', id: 'PUSD' } })
    expect(next.notice).toBeNull()
    // 25 dollars is not 25 BCH.
    expect(next.amount).toBe('')
  })

  it('swaps PUSD for MUSD on Bitcoin Cash, keeping a dollar amount', () => {
    const pusdToBch = pick({ ...INITIAL_STATE, amount: '10' }, 'pay', { kind: 'bch', id: 'PUSD' })
    // Picking the asset already on the other side swaps the two: PUSD → USDC on Base.
    expect(pusdToBch.direction).toBe('out')
    const next = pick(pusdToBch, 'receive', { kind: 'bch', id: 'MUSD' })
    expect(next.direction).toBe('local')
    expect(sidesOf(next)).toEqual({ pay: { kind: 'bch', id: 'PUSD' }, receive: { kind: 'bch', id: 'MUSD' } })
    expect(next.amount).toBe('10')
  })

  it('swaps the sides when the other side’s asset is picked', () => {
    const local = {
      ...INITIAL_STATE,
      direction: 'local' as const,
      bchFrom: 'PUSD' as const,
      bchAsset: 'MUSD' as const,
    }
    const next = pick(local, 'pay', { kind: 'bch', id: 'MUSD' })
    expect(sidesOf(next)).toEqual({ pay: { kind: 'bch', id: 'MUSD' }, receive: { kind: 'bch', id: 'PUSD' } })
  })

  it('goes from a Bitcoin Cash pair back to a bridge when a stablecoin is picked', () => {
    const local = {
      ...INITIAL_STATE,
      direction: 'local' as const,
      bchFrom: 'PUSD' as const,
      bchAsset: 'MUSD' as const,
    }
    const next = pick(local, 'receive', { kind: 'stable', stable: usdcSol })
    expect(next.direction).toBe('out')
    expect(sidesOf(next)).toEqual({
      pay: { kind: 'bch', id: 'PUSD' },
      receive: { kind: 'stable', stable: usdcSol },
    })
    expect(next.notice).toBeNull()
  })

  it('keeps the direction when a side picks from its own group', () => {
    const next = pick(INITIAL_STATE, 'receive', { kind: 'bch', id: 'MUSD' })
    expect(next.direction).toBe('in')
    expect(next.bchAsset).toBe('MUSD')
  })

  it('flips a Bitcoin Cash pair', () => {
    const local = {
      ...INITIAL_STATE,
      direction: 'local' as const,
      bchFrom: 'BCH' as const,
      bchAsset: 'PUSD' as const,
    }
    const next = swapReducer(local, { type: 'flip', amount: '9.5' })
    expect(sidesOf(next)).toEqual({ pay: { kind: 'bch', id: 'PUSD' }, receive: { kind: 'bch', id: 'BCH' } })
    expect(next.amount).toBe('9.5')
  })

  it('clears the notice on the next change', () => {
    const noted = pick(INITIAL_STATE, 'receive', { kind: 'stable', stable: usdtEth })
    expect(noted.notice).not.toBeNull()
    expect(swapReducer(noted, { type: 'amount', value: '5' }).notice).toBeNull()
  })

  it('round-trips through the address bar', () => {
    const state = {
      ...INITIAL_STATE,
      direction: 'out' as const,
      stable: usdtEth,
      bchAsset: 'MUSD' as const,
      amount: '12.5',
    }
    const back = stateFromParams(new URLSearchParams(paramsFromState(state)))
    expect(back).toMatchObject({ direction: 'out', stable: usdtEth, bchAsset: 'MUSD', amount: '12.5' })
  })

  it('round-trips a Bitcoin Cash pair through the address bar', () => {
    const back = stateFromParams(new URLSearchParams('from=PUSD&to=MUSD&amount=3'))
    expect(back).toMatchObject({ direction: 'local', bchFrom: 'PUSD', bchAsset: 'MUSD', amount: '3' })
    expect(paramsFromState(back)).toBe('from=PUSD&to=MUSD&amount=3')
    // The same asset on both sides is not a pair: back to the default.
    expect(stateFromParams(new URLSearchParams('from=PUSD&to=PUSD')).direction).toBe('in')
  })

  it('cleans what people type', () => {
    expect(cleanAmount('1,5')).toBe('1.5')
    expect(cleanAmount('.5')).toBe('0.5')
    expect(cleanAmount('1.2.3')).toBe('1.23')
    expect(cleanAmount('$10')).toBe('10')
  })
})
