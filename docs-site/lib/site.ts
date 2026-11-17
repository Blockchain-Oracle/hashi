/** The docs site's own constants: where things live, and the words used everywhere. */

export const SITE = {
  name: "Hashi",
  title: "Hashi docs",
  /** 橋: bridge. */
  kanji: "橋",
  meaning: "bridge",
  tagline: "Dollars in, dollars out.",
  description:
    "Hashi brings USDC and USDT from eight chains to Bitcoin Cash as PUSD, MUSD or BCH, and back, through NEAR Intents, THORChain and Cauldron, with every route priced and every fee shown before you approve in your own wallet.",
  url: "https://docs.hashi.cash",
  app: "https://hashi.cash",
  swap: "https://hashi.cash/swap",
} as const

/** Where the docs start, and the first page of each section (the top tabs). */
export const DOCS = {
  base: "/docs",
  start: "/docs/guide",
  routes: "/docs/routes",
  bch: "/docs/bitcoin-cash",
  build: "/docs/build",
} as const

/** Link previews: one size for every page. */
export const OG = { width: 1200, height: 630 } as const
