import type { WalletUtxo } from './wallet'

/**
 * Which coins pay for a trade. Largest first, so a trade uses as few inputs (and as small a transaction) as
 * possible. Tokens are never spent by accident: BCH funding takes only coins without tokens.
 */

export function pickBchCoins(utxos: WalletUtxo[], needSats: bigint): WalletUtxo[] | undefined {
  const plain = utxos.filter((u) => !u.token).sort((a, b) => (a.value > b.value ? -1 : 1))
  return accumulate(plain, needSats, (u) => u.value)
}

export function pickTokenCoins(
  utxos: WalletUtxo[],
  category: string,
  needAmount: bigint,
): WalletUtxo[] | undefined {
  const coins = utxos
    .filter((u) => u.token?.category === category)
    .sort((a, b) => ((a.token?.amount ?? 0n) > (b.token?.amount ?? 0n) ? -1 : 1))
  return accumulate(coins, needAmount, (u) => u.token?.amount ?? 0n)
}

function accumulate(coins: WalletUtxo[], need: bigint, value: (u: WalletUtxo) => bigint) {
  const picked: WalletUtxo[] = []
  let total = 0n
  for (const coin of coins) {
    if (total >= need) break
    picked.push(coin)
    total += value(coin)
  }
  return total >= need ? picked : undefined
}

export function totals(utxos: WalletUtxo[]) {
  const tokens = new Map<string, bigint>()
  let sats = 0n
  for (const u of utxos) {
    if (u.token) tokens.set(u.token.category, (tokens.get(u.token.category) ?? 0n) + u.token.amount)
    else sats += u.value
  }
  return { sats, tokens }
}
