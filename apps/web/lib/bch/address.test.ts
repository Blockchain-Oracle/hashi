import { describe, expect, it } from 'vitest'
import {
  normalizeBchAddress,
  parseBchAddress,
  toPlainAddress,
  toTokenAddress,
  withoutPrefix,
} from './address'

// THORChain's BCH vault address on 2026-11-16 (from /inbound_addresses), and its token-aware form computed with an
// independent CashAddr encoder. NEAR Intents rejected the z form and accepted the q form of this key.
const PLAIN = 'bitcoincash:qpk3zrsl6nlxm9mr8au8fenn932sjw0m8y4pnsakyk'
const TOKEN = 'bitcoincash:zpk3zrsl6nlxm9mr8au8fenn932sjw0m8yjtqwnsm9'

describe('BCH addresses', () => {
  it('converts between the plain and token-aware forms of one key', () => {
    expect(toTokenAddress(PLAIN)).toBe(TOKEN)
    expect(toPlainAddress(TOKEN)).toBe(PLAIN)
    expect(toTokenAddress(TOKEN)).toBe(TOKEN)
  })

  it('accepts addresses without the prefix and in uppercase', () => {
    expect(toTokenAddress(withoutPrefix(PLAIN))).toBe(TOKEN)
    expect(toPlainAddress(TOKEN.toUpperCase())).toBe(PLAIN)
  })

  it('reports the kind and whether the form is token-aware', () => {
    expect(parseBchAddress(PLAIN)).toMatchObject({ kind: 'p2pkh', tokenAware: false })
    expect(parseBchAddress(TOKEN)).toMatchObject({ kind: 'p2pkh', tokenAware: true })
  })

  it('rejects a typo, a testnet address and mixed case', () => {
    expect(typeof parseBchAddress(`${PLAIN.slice(0, -1)}q`)).toBe('string')
    expect(typeof parseBchAddress('bchtest:qpk3zrsl6nlxm9mr8au8fenn932sjw0m8y4pnsakyk')).toBe('string')
    expect(typeof parseBchAddress('bitcoincash:Qpk3zrsl6nlxm9mr8au8fenn932sjw0m8y4pnsakyk')).toBe('string')
    expect(() => toTokenAddress('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')).toThrow()
  })

  it('normalises legacy and unprefixed addresses to prefixed CashAddr', () => {
    // NEAR Intents' published BCH treasury, in both forms (treasury-addresses.md).
    expect(normalizeBchAddress('1LxByjYMdnogW9Nc73srT4NCbS8oPVaXvZ')).toBe(
      'bitcoincash:qrdd5m5s72wzs4u373ux2fcpn02hw00u7v9wr8cex8',
    )
    expect(normalizeBchAddress(withoutPrefix(PLAIN))).toBe(PLAIN)
    expect(normalizeBchAddress(TOKEN)).toBe(PLAIN)
  })
})
