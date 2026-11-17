import { base58ToBin } from '@bitauth/libauth'
import { getAddress, isAddress } from 'viem'
import { normalizeBchAddress, parseBchAddress } from '@/lib/bch/address'
import { STABLES } from '@/lib/constants/assets'
import type { ChainKind } from '@/lib/constants/chains'

/**
 * Guards for a custom recipient (feature 10). The costly mistakes are sending to a token's own contract, to an
 * address on the wrong chain, or to a typo; each is caught here before any quote asks for a deposit address.
 */

export type RecipientCheck = { ok: true; address: string } | { ok: false; error: string }

const TOKEN_CONTRACTS = new Set(STABLES.map((s) => s.address.toLowerCase()))
const SOLANA_KEY_BYTES = 32

export function checkRecipient(kind: ChainKind, input: string): RecipientCheck {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Paste an address.' }

  if (kind === 'evm') {
    if (!isAddress(text, { strict: false })) {
      return {
        ok: false,
        error: looksLikeBch(text)
          ? 'That is a Bitcoin Cash address. This side needs an EVM address (0x…).'
          : 'Not a valid EVM address (0x followed by 40 hex characters).',
      }
    }
    if (TOKEN_CONTRACTS.has(text.toLowerCase())) {
      return { ok: false, error: 'That is a token contract. Funds sent there are lost.' }
    }
    if (/^0x0{40}$/i.test(text)) return { ok: false, error: 'That is the zero address.' }
    return { ok: true, address: getAddress(text.toLowerCase()) }
  }

  if (kind === 'solana') {
    const bytes = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text) ? base58ToBin(text) : 'invalid'
    if (typeof bytes === 'string' || bytes.length !== SOLANA_KEY_BYTES) {
      return { ok: false, error: 'Not a valid Solana address.' }
    }
    if (TOKEN_CONTRACTS.has(text.toLowerCase())) {
      return { ok: false, error: 'That is a token mint. Funds sent there are lost.' }
    }
    return { ok: true, address: text }
  }

  if (isAddress(text, { strict: false })) {
    return { ok: false, error: 'That is an EVM address. This side needs a Bitcoin Cash address.' }
  }
  try {
    // NEAR Intents and THORChain pay plain BCH to the `q…` form; a `z…` address is the same key.
    return { ok: true, address: normalizeBchAddress(text) }
  } catch (error) {
    const parsed = parseBchAddress(text)
    return { ok: false, error: typeof parsed === 'string' ? parsed : (error as Error).message }
  }
}

function looksLikeBch(text: string) {
  return /^(bitcoincash:)?[qpzr][0-9a-z]{41}$/i.test(text)
}
