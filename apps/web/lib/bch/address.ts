import { CashAddressType, decodeBase58Address, decodeCashAddress, encodeCashAddress } from '@bitauth/libauth'
import { BCH_ADDRESS_PREFIX } from '@/lib/constants/chains'

/**
 * One key, two addresses. A CashAddress starting with `q` (or `p` for scripts) receives plain BCH; the same key
 * written with `z` (or `r`) tells wallets it can also receive CashTokens such as PUSD and MUSD. NEAR Intents only
 * accepts the plain form as a recipient, while PUSD and MUSD must go to the token-aware form, so Hashi converts
 * between them.
 */

export type BchAddressKind = 'p2pkh' | 'p2sh'

export interface BchAddress {
  kind: BchAddressKind
  payload: Uint8Array
  /** True for the token-aware (`z`/`r`) form. */
  tokenAware: boolean
}

const TYPE_INFO: Record<CashAddressType, { kind: BchAddressKind; tokenAware: boolean }> = {
  [CashAddressType.p2pkh]: { kind: 'p2pkh', tokenAware: false },
  [CashAddressType.p2sh]: { kind: 'p2sh', tokenAware: false },
  [CashAddressType.p2pkhWithTokens]: { kind: 'p2pkh', tokenAware: true },
  [CashAddressType.p2shWithTokens]: { kind: 'p2sh', tokenAware: true },
}

const PLAIN_TYPE = { p2pkh: CashAddressType.p2pkh, p2sh: CashAddressType.p2sh } as const
const TOKEN_TYPE = { p2pkh: CashAddressType.p2pkhWithTokens, p2sh: CashAddressType.p2shWithTokens } as const

/**
 * Read a mainnet CashAddress, with or without the `bitcoincash:` prefix. Returns a message a person can act on
 * when the input is not one.
 */
export function parseBchAddress(input: string): BchAddress | string {
  const text = input.trim()
  if (text !== text.toLowerCase() && text !== text.toUpperCase()) {
    return 'A Bitcoin Cash address is all lowercase or all uppercase, never mixed.'
  }
  const lower = text.toLowerCase()
  const decoded = decodeCashAddress(lower.includes(':') ? lower : `${BCH_ADDRESS_PREFIX}:${lower}`)
  if (typeof decoded === 'string') return 'This is not a valid Bitcoin Cash address. Check it for typos.'
  if (decoded.prefix !== BCH_ADDRESS_PREFIX) return 'Use a Bitcoin Cash mainnet address (bitcoincash:…).'
  return { ...TYPE_INFO[decoded.type], payload: decoded.payload }
}

function encode(address: BchAddress, tokenAware: boolean): string {
  const type = tokenAware ? TOKEN_TYPE[address.kind] : PLAIN_TYPE[address.kind]
  return encodeCashAddress({ payload: address.payload, prefix: BCH_ADDRESS_PREFIX, type }).address
}

/** The plain (`q`/`p`) form, with prefix. Throws on an invalid address. */
export function toPlainAddress(input: string): string {
  const parsed = parseBchAddress(input)
  if (typeof parsed === 'string') throw new Error(parsed)
  return encode(parsed, false)
}

/** The token-aware (`z`/`r`) form, with prefix. Throws on an invalid address. */
export function toTokenAddress(input: string): string {
  const parsed = parseBchAddress(input)
  if (typeof parsed === 'string') throw new Error(parsed)
  return encode(parsed, true)
}

/** For display: the address without its `bitcoincash:` prefix. */
export function withoutPrefix(address: string): string {
  const colon = address.indexOf(':')
  return colon === -1 ? address : address.slice(colon + 1)
}

/** Legacy base58 version bytes on mainnet. */
const LEGACY_P2PKH = 0
const LEGACY_P2SH = 5

/**
 * Any mainnet Bitcoin Cash address a provider might hand back (CashAddr with or without the prefix, or a legacy
 * `1…`/`3…` address), as the prefixed plain CashAddr the Cauldron Router and Electrum expect.
 */
export function normalizeBchAddress(input: string): string {
  const text = input.trim()
  if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(text)) {
    const legacy = decodeBase58Address(text)
    if (typeof legacy === 'string') throw new Error(`Not a valid Bitcoin Cash address: ${text}`)
    const type =
      legacy.version === LEGACY_P2PKH
        ? CashAddressType.p2pkh
        : legacy.version === LEGACY_P2SH
          ? CashAddressType.p2sh
          : undefined
    if (!type) throw new Error(`Unsupported legacy address version ${legacy.version}`)
    return encodeCashAddress({ payload: legacy.payload, prefix: BCH_ADDRESS_PREFIX, type }).address
  }
  return toPlainAddress(text)
}
