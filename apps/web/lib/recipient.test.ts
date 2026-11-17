import { describe, expect, it } from 'vitest'
import { toTokenAddress } from '@/lib/bch/address'
import { checkRecipient } from './recipient'

describe('recipient guards', () => {
  it('accepts an EVM address and checksums it', () => {
    const check = checkRecipient('evm', '0x778e7083af761329b19fcb586be17b7c1f8140e2')
    expect(check).toEqual({ ok: true, address: '0x778e7083aF761329B19fCB586bE17b7C1f8140e2' })
  })

  it('refuses a token contract as a recipient', () => {
    const check = checkRecipient('evm', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')
    expect(check.ok).toBe(false)
  })

  it('names the wrong chain when a BCH address is pasted on the EVM side', () => {
    const check = checkRecipient('evm', 'bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfnhks603')
    expect(check).toMatchObject({ ok: false, error: expect.stringContaining('Bitcoin Cash') })
  })

  it('turns a token-aware BCH address into the plain form', () => {
    const plain = 'bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfnhks603'
    expect(checkRecipient('bch', toTokenAddress(plain))).toEqual({ ok: true, address: plain })
  })

  it('refuses a Solana mint and accepts a wallet', () => {
    expect(checkRecipient('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v').ok).toBe(false)
    expect(checkRecipient('solana', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM').ok).toBe(true)
  })
})
