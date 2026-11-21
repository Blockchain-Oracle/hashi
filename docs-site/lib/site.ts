/** The docs site's own constants: where things live, and the words used everywhere. */

/**
 * Where the app and the docs are served, read at build time (the Docker build's arguments, the same names the app
 * uses), so a deploy on a temporary address links to itself. hashi.cash by default.
 */
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hashi.cash"
const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.hashi.cash"

export const SITE = {
  name: "Hashi",
  title: "Hashi docs",
  /** 橋: bridge. */
  kanji: "橋",
  meaning: "bridge",
  tagline: "Dollars in, dollars out.",
  description:
    "Hashi brings USDC and USDT from eight chains to Bitcoin Cash as PUSD, MUSD or BCH, and back, through NEAR Intents, THORChain and Cauldron, with every route priced and every fee shown before you approve in your own wallet.",
  url: DOCS_URL,
  app: APP_URL,
  swap: `${APP_URL}/swap`,
  repo: "https://github.com/Blockchain-Oracle/hashi",
} as const

/**
 * What every BCH BLAZE entry shows in its banner: the bounty, the Widget Factory deck, the source and the team's
 * CashTokens address (BLAZE sends prizes there; EMBER2026 holders vote by sending their tokens there). The QR image
 * is drawn from this address by `.github/assets/qr/qr.mts`, the same drawing as the app's and the README's: run it
 * again if the address changes.
 */
export const BLAZE = {
  event: "BCH BLAZE 2026",
  bounty: "Stablecoin Bridge",
  bountyUrl: "https://bchblaze.cash/bounties/stablecoin-bridge/",
  deck: "https://hashi.cash/slides",
  demo: "https://youtu.be/bbLQ44UAdBU",
  cashtokens: "bitcoincash:zrrac20n7tmqwysz2l6aqxyw5w6npqv9pssndrqjnh",
  qr: "/cashtokens-qr.svg",
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
