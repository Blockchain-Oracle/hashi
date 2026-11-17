/**
 * Which routes carry which pair, and what each asks of you: the same facts the app's engine uses
 * (apps/web/lib/constants/assets.ts, lib/engine/quote.ts, local-quote.ts), restated for the docs' route explorer.
 */

export type Chain = "base" | "ethereum" | "arbitrum" | "optimism" | "polygon" | "avalanche" | "bsc" | "solana"
export type Stable = "USDC" | "USDT"
export type BchToken = "PUSD" | "MUSD" | "BCH"
export type Direction = "in" | "out" | "local"
export type Carrier = "near" | "thorchain" | "cauldron"

export const CHAINS: { id: Chain; name: string; logo: string; stables: Stable[] }[] = [
  { id: "base", name: "Base", logo: "base", stables: ["USDC"] },
  { id: "ethereum", name: "Ethereum", logo: "ethereum", stables: ["USDC", "USDT"] },
  { id: "arbitrum", name: "Arbitrum", logo: "arbitrum", stables: ["USDC"] },
  { id: "optimism", name: "Optimism", logo: "optimism", stables: ["USDC", "USDT"] },
  { id: "polygon", name: "Polygon", logo: "polygon", stables: ["USDC", "USDT"] },
  { id: "avalanche", name: "Avalanche", logo: "avalanche", stables: ["USDC", "USDT"] },
  { id: "bsc", name: "BNB Chain", logo: "bsc", stables: ["USDC", "USDT"] },
  { id: "solana", name: "Solana", logo: "solana", stables: ["USDC", "USDT"] },
]

export const BCH_TOKENS: { id: BchToken; name: string; logo: string }[] = [
  { id: "PUSD", name: "ParyonUSD", logo: "pusd.svg" },
  { id: "MUSD", name: "MoriaUSD", logo: "musd.png" },
  { id: "BCH", name: "Bitcoin Cash", logo: "bch" },
]

/** THORChain has pools for USDC on Base, and USDC and USDT on Ethereum, Avalanche and BNB Chain. */
const THORCHAIN: Partial<Record<Chain, Stable[]>> = {
  base: ["USDC"],
  ethereum: ["USDC", "USDT"],
  avalanche: ["USDC", "USDT"],
  bsc: ["USDC", "USDT"],
}

export const NAMES: Record<Carrier, string> = { near: "NEAR Intents", thorchain: "THORChain", cauldron: "Cauldron" }

export interface RouteFact {
  /** The legs, in the order the money meets them. */
  legs: Carrier[]
  /** Approvals per wallet. */
  approvals: { wallet: string; count: number; note?: string }[]
}

export interface Explained {
  routes: RouteFact[]
  /** Bridges that can't carry this pair, and why. */
  missing: { carrier: Carrier; why: string }[]
}

export function explain(direction: Direction, chain: Chain, stable: Stable, from: BchToken, to: BchToken): Explained {
  if (direction === "local") {
    if (from === to) return { routes: [], missing: [] }
    return { routes: [{ legs: ["cauldron"], approvals: [{ wallet: "Bitcoin Cash wallet", count: 1 }] }], missing: [] }
  }
  const token = direction === "in" ? to : from
  const viaCauldron = token !== "BCH"
  const chainName = CHAINS.find((c) => c.id === chain)?.name ?? chain
  const wallet = chain === "solana" ? "Solana wallet" : `${chainName} wallet`
  const bridges: Carrier[] = ["near"]
  const missing: Explained["missing"] = []
  if (THORCHAIN[chain]?.includes(stable)) bridges.push("thorchain")
  else missing.push({ carrier: "thorchain", why: `no ${stable} pool on ${chainName}` })

  const routes = bridges.map<RouteFact>((bridge) => {
    if (direction === "in") {
      const deposit = bridge === "near" ? 1 : 2
      return {
        legs: viaCauldron ? [bridge, "cauldron"] : [bridge],
        approvals: [
          { wallet, count: deposit, ...(bridge === "thorchain" ? { note: "allow, then deposit" } : {}) },
          ...(viaCauldron ? [{ wallet: "Bitcoin Cash wallet", count: 1, note: "the Cauldron swap" }] : []),
        ],
      }
    }
    return {
      legs: viaCauldron ? ["cauldron", bridge] : [bridge],
      approvals: [
        { wallet: "Bitcoin Cash wallet", count: viaCauldron ? 2 : 1, ...(viaCauldron ? { note: "sell, then send" } : {}) },
      ],
    }
  })
  return { routes, missing }
}

/** The same swap in the app, as a shareable link. */
export function swapQuery(direction: Direction, chain: Chain, stable: Stable, from: BchToken, to: BchToken) {
  const id = `${stable}.${chain}`
  if (direction === "in") return `from=${id}&to=${to}`
  if (direction === "out") return `from=${from}&to=${id}`
  return `from=${from}&to=${to}`
}
