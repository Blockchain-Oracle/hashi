import { formatUnits } from 'viem'

/** A base-unit amount as a readable number, trimmed to `maxFraction` decimals (never rounding up). */
export function formatAmount(base: bigint, decimals: number, maxFraction = 6): string {
  const [whole = '0', fraction = ''] = formatUnits(base, decimals).split('.')
  const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, '')
  const grouped = Number(whole).toLocaleString('en-US')
  return trimmed ? `${grouped}.${trimmed}` : grouped
}

/** "~45 s", "~3 min", "~1 h 10 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${Math.max(1, Math.round(seconds))} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `~${hours} h ${rest} min` : `~${hours} h`
}

export function formatUsd(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

/** `0x778e…40e2`, `qz3k…8f2a` (the `bitcoincash:` prefix dropped), `9WzD…AWWM`. */
export function shortAddress(address: string, head = 4, tail = 4): string {
  const bare = address.includes(':') ? (address.split(':')[1] ?? address) : address
  const start = bare.startsWith('0x') ? head + 2 : head
  return bare.length <= start + tail + 1 ? bare : `${bare.slice(0, start)}…${bare.slice(-tail)}`
}

/** How many decimals an amount of this asset is shown with: whole cents for dollars, sats for BCH. */
export function displayDecimals(symbol: string): number {
  return symbol === 'BCH' ? 8 : symbol === 'PUSD' || symbol === 'MUSD' ? 2 : 4
}

/**
 * A bridge's minimum, rounded up to the precision the asset is shown in, so the amount on screen is the amount
 * that gets typed, and it is never a hair under the real minimum (0.812345 USDC shows, and fills in, as 0.8124).
 */
export function minimumToShow(minimum: bigint, decimals: number, symbol: string): bigint {
  const dropped = decimals - displayDecimals(symbol)
  if (dropped <= 0) return minimum
  const unit = 10n ** BigInt(dropped)
  return ((minimum + unit - 1n) / unit) * unit
}
