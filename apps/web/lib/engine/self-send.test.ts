import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STABLES } from '@/lib/constants/assets'
import { paymentLink } from '@/lib/pay-link'
import { NEAR_STATUS_PENDING } from '@/lib/providers/near-status.fixture'
import { checkBridge, nextStep, sendDeposit } from './runner'
import type { SwapRecord } from './swap'

const near = vi.hoisted(() => ({ status: undefined as unknown }))
vi.mock('@/lib/providers/near', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/providers/near')>()),
  getNearStatus: vi.fn(async () => near.status),
}))

const DEPOSIT = '0xdF0363e2D0d39223855C826AaA2cB19768423364'
const record: SwapRecord = {
  id: 'self',
  createdAt: 1_000_000,
  updatedAt: 1_000_000,
  provider: 'near',
  direction: 'in',
  stable: { chain: 'base', symbol: 'USDC' },
  bchAsset: 'BCH',
  amountIn: '1000000',
  approvals: 0,
  selfSend: true,
  addresses: {
    stableSide: '0x481231a8DFE80B16Cdf823116eB62a71342b3210',
    bchPlain: 'bitcoincash:qrmv9356fw89fugegc6dm0nspv673yczwyh3jfs43p',
    bchToken: 'bitcoincash:zrmv9356fw89fugegc6dm0nspv673yczwyh3jfs43p',
  },
  depositAddress: DEPOSIT,
  status: 'quoted',
  events: [],
}

function nearSays(status: string, originTx?: string) {
  near.status = {
    ...NEAR_STATUS_PENDING,
    status,
    statusText: status,
    swapDetails: {
      ...NEAR_STATUS_PENDING.swapDetails,
      originChainTxHashes: originTx ? [{ hash: originTx, explorerUrl: '' }] : [],
    },
  }
}

describe('a swap the person sends themselves', () => {
  beforeEach(() => {
    near.status = undefined
  })

  it('never asks a wallet for the deposit: it waits for NEAR instead', () => {
    expect(nextStep(record)).toBe('wait')
    expect(nextStep({ ...record, selfSend: false })).toBe('deposit')
  })

  it('refuses to send a deposit from a connected wallet', async () => {
    await expect(sendDeposit(record, {}, () => {})).rejects.toThrow(/send this one yourself/)
  })

  it('keeps waiting while NEAR has no deposit', async () => {
    nearSays('PENDING_DEPOSIT')
    expect(await checkBridge(record, () => {})).toBe(record)
  })

  it('moves on, with the transaction, as soon as NEAR sees the deposit', async () => {
    nearSays('KNOWN_DEPOSIT_TX', '0xabc')
    const next = await checkBridge(record, () => {})
    expect(next.status).toBe('deposit-sent')
    expect(next.depositTx).toBe('0xabc')
    expect(nextStep(next)).toBe('wait')
  })

  it('moves on even when NEAR reports it already swapping', async () => {
    nearSays('PROCESSING')
    expect((await checkBridge(record, () => {})).status).toBe('deposit-sent')
  })
})

describe('paymentLink', () => {
  it('is an EIP-681 token transfer on EVM chains: token, chain id, recipient, base units', () => {
    const usdc = STABLES.find((s) => s.chain === 'base' && s.symbol === 'USDC')
    if (!usdc) throw new Error('no Base USDC')
    expect(paymentLink(usdc, DEPOSIT, 1_000_000n)).toBe(
      `ethereum:${usdc.address}@8453/transfer?address=${DEPOSIT}&uint256=1000000`,
    )
  })

  it('is a Solana Pay transfer request on Solana: recipient, decimal amount, mint', () => {
    const usdc = STABLES.find((s) => s.chain === 'solana' && s.symbol === 'USDC')
    if (!usdc) throw new Error('no Solana USDC')
    const to = 'So11111111111111111111111111111111111111112'
    expect(paymentLink(usdc, to, 2_500_000n)).toBe(`solana:${to}?amount=2.5&spl-token=${usdc.address}`)
  })
})
