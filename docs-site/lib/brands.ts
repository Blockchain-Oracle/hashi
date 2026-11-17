import type { Brand } from "@/components/logo-cloud"

/**
 * What Hashi really works with (facts from apps/web/lib: providers, constants/chains, wallets). Marks are the same
 * ones the app shows: web3icons (MIT) rendered to files, and the issuers' own PUSD, MUSD, Cauldron and
 * WizardConnect icons.
 */
export const BRANDS: Brand[] = [
  { name: "NEAR Intents", logo: "near" },
  { name: "THORChain", logo: "thorchain" },
  { name: "Cauldron", logo: "cauldron.png" },
  { name: "WizardConnect", logo: "wizardconnect.png" },
  { name: "WalletConnect", logo: "walletconnect" },
  { name: "ParyonUSD", logo: "pusd.svg" },
  { name: "MoriaUSD", logo: "musd.png" },
  { name: "Bitcoin Cash", logo: "bch" },
  { name: "Ethereum", logo: "ethereum" },
  { name: "Base", logo: "base" },
  { name: "Arbitrum", logo: "arbitrum" },
  { name: "Optimism", logo: "optimism" },
  { name: "Polygon", logo: "polygon" },
  { name: "Avalanche", logo: "avalanche" },
  { name: "BNB Chain", logo: "bsc" },
  { name: "Solana", logo: "solana" },
  { name: "USDC", logo: "usdc" },
  { name: "USDT", logo: "usdt" },
]

/** The wallets people already have, on both sides. */
export const WALLETS: Brand[] = [
  { name: "MetaMask", logo: "metamask" },
  { name: "Phantom", logo: "phantom" },
  { name: "Rabby", logo: "rabby" },
  { name: "Coinbase Wallet", logo: "coinbase" },
  { name: "Selene", logo: "selene.png" },
  { name: "Paytaca", logo: "paytaca.png" },
  { name: "Cashonize", logo: "cashonize.png" },
]
