import { describe, expect, it } from 'vitest'
import { thorAddress } from './thorchain'

describe('thorAddress', () => {
  it('drops the bitcoincash: prefix THORChain cannot parse', () => {
    expect(thorAddress('bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy')).toBe(
      'qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy',
    )
  })

  it('leaves other addresses alone', () => {
    expect(thorAddress('0x1111111111111111111111111111111111111111')).toBe(
      '0x1111111111111111111111111111111111111111',
    )
  })
})
