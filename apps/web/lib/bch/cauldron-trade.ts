import { decodeTransaction, hexToBin, lockingBytecodeToCashAddress } from '@bitauth/libauth'
import { BCH_ASSETS } from '@/lib/constants/assets'
import { BCH_ADDRESS_PREFIX } from '@/lib/constants/chains'
import { bchForTokenSwap, routerFeeTokens, spendableForBuy } from '@/lib/engine/cauldron-fees'
import { getRouter, type RouterBuild, routerAsset } from '@/lib/providers/cauldron'
import { pickBchCoins, pickTokenCoins } from './funding'
import { outpointKey, type WalletAddress, type WalletUtxo } from './wallet'

/**
 * Cauldron trades funded by the connected wallet's coins, built by the Router. Each returns the build plus the
 * owner of every funding coin, which the WizardConnect sign request needs.
 */

export interface PreparedTrade {
  build: RouterBuild
  owners: Map<string, WalletAddress>
}

function owners(coins: WalletUtxo[]) {
  return new Map(coins.map((c) => [outpointKey(c.txid, c.vout), c.address]))
}

function funding(coins: WalletUtxo[]) {
  return coins.map((c) => ({
    txid: c.txid,
    vout: c.vout,
    value: c.value,
    scriptHex: c.address.lockingHex,
    ...(c.token ? { token: c.token } : {}),
  }))
}

/**
 * Spend these BCH coins on PUSD or MUSD, leaving room for the Router fee, the miner fee and the token output's
 * 1,000 sats. Priced twice: the pool count sets the miner fee. `minOutput`: the Router refuses to build below it.
 */
export async function prepareTokenBuy(params: {
  asset: 'PUSD' | 'MUSD'
  coins: WalletUtxo[]
  receive: WalletAddress
  minOutput?: bigint
}): Promise<PreparedTrade> {
  const router = getRouter()
  const category = routerAsset(params.asset)
  const available = params.coins.reduce((sum, c) => sum + c.value, 0n)
  let spend = spendableForBuy(available, 1)
  if (spend <= 0n) throw new Error('Too little BCH to cover the Cauldron fees')
  const first = await router.quote({ sell: 'bch', buy: category, amount: spend, side: 'sell' })
  if (first.pools > 1) spend = spendableForBuy(available, first.pools)
  const build = await router.build({
    sell: 'bch',
    buy: category,
    amount: spend,
    side: 'sell',
    funding: funding(params.coins),
    receiveAddress: params.receive.token,
    changeAddress: params.receive.plain,
    ...(params.minOutput === undefined ? {} : { minOutput: params.minOutput }),
  })
  return { build, owners: owners(params.coins) }
}

/**
 * Sell PUSD or MUSD for BCH. The proceeds go to `proceedsTo`: the person's own address, or a bridge's deposit
 * address so the sale and the deposit are one transaction (one approval).
 */
export async function prepareTokenSell(params: {
  asset: 'PUSD' | 'MUSD'
  amount: bigint
  coins: WalletUtxo[]
  receive: WalletAddress
  proceedsTo: string
  minOutput?: bigint
}): Promise<PreparedTrade> {
  const category = BCH_ASSETS[params.asset].category
  const coins = pickTokenCoins(params.coins, category, params.amount)
  if (!coins) throw new Error(`Not enough ${params.asset} in this wallet`)
  const build = await getRouter().build({
    sell: category,
    buy: 'bch',
    amount: params.amount,
    side: 'sell',
    funding: funding(coins),
    receiveAddress: params.receive.token,
    changeAddress: params.proceedsTo,
    ...(params.minOutput === undefined ? {} : { minOutput: params.minOutput }),
  })
  return { build, owners: owners(coins) }
}

/**
 * Spend exactly `amountSats` of the wallet's plain BCH on PUSD or MUSD (a swap that stays on Bitcoin Cash): the
 * pools get what is left after the Router fee, the miner fee and the token output's 1,000 sats; the rest of the
 * funding coins comes back as change. Priced twice: the pool count sets the miner fee.
 */
export async function prepareBchBuy(params: {
  asset: 'PUSD' | 'MUSD'
  amountSats: bigint
  coins: WalletUtxo[]
  receive: WalletAddress
  minOutput?: bigint
}): Promise<PreparedTrade> {
  const coins = pickBchCoins(params.coins, params.amountSats)
  if (!coins) throw new Error('Not enough BCH in this wallet')
  const router = getRouter()
  const category = routerAsset(params.asset)
  let spend = spendableForBuy(params.amountSats, 1)
  if (spend <= 0n) throw new Error('Too little BCH to cover the Cauldron fees')
  const first = await router.quote({ sell: 'bch', buy: category, amount: spend, side: 'sell' })
  if (first.pools > 1) spend = spendableForBuy(params.amountSats, first.pools)
  const build = await router.build({
    sell: 'bch',
    buy: category,
    amount: spend,
    side: 'sell',
    funding: funding(coins),
    receiveAddress: params.receive.token,
    changeAddress: params.receive.plain,
    ...(params.minOutput === undefined ? {} : { minOutput: params.minOutput }),
  })
  return { build, owners: owners(coins) }
}

/**
 * PUSD ⇄ MUSD in one transaction (the Router's "combined" route through both tokens' pools). The Router's fee is
 * paid in the sold token on top of `amount`, and the miner fee needs a little plain BCH from the wallet, since no
 * BCH comes out of the trade (a live build with token coins only failed with `insufficient_funds`).
 */
export async function prepareTokenSwap(params: {
  from: 'PUSD' | 'MUSD'
  to: 'PUSD' | 'MUSD'
  amount: bigint
  coins: WalletUtxo[]
  receive: WalletAddress
  minOutput?: bigint
}): Promise<PreparedTrade> {
  const sold = BCH_ASSETS[params.from].category
  const tokenCoins = pickTokenCoins(params.coins, sold, params.amount + routerFeeTokens(params.amount))
  if (!tokenCoins)
    throw new Error(`Not enough ${params.from} in this wallet (the 0.1% Cauldron fee comes on top)`)
  const router = getRouter()
  const quote = await router.quote({
    sell: sold,
    buy: routerAsset(params.to),
    amount: params.amount,
    side: 'sell',
  })
  const needSats = bchForTokenSwap(quote.pools)
  const bchCoins = pickBchCoins(params.coins, needSats)
  if (!bchCoins) {
    throw new Error(
      `Keep a little BCH in this wallet for the network fee: about ${Number(needSats) / 1e8} BCH for this trade`,
    )
  }
  const coins = [...tokenCoins, ...bchCoins]
  const build = await router.build({
    sell: sold,
    buy: routerAsset(params.to),
    amount: params.amount,
    side: 'sell',
    funding: funding(coins),
    receiveAddress: params.receive.token,
    changeAddress: params.receive.plain,
    ...(params.minOutput === undefined ? {} : { minOutput: params.minOutput }),
  })
  return { build, owners: owners(coins) }
}

/** The sats a build pays to `address` (for a sale: the proceeds that reach that address). */
export function satsPaidTo(build: RouterBuild, address: string): bigint {
  const tx = decodeTransaction(hexToBin(build.unsigned_tx_hex))
  if (typeof tx === 'string') throw new Error(tx)
  let total = 0n
  for (const output of tx.outputs) {
    if (output.token) continue
    const decoded = lockingBytecodeToCashAddress({
      bytecode: output.lockingBytecode,
      prefix: BCH_ADDRESS_PREFIX,
    })
    if (typeof decoded !== 'string' && decoded.address === address) total += output.valueSatoshis
  }
  return total
}
