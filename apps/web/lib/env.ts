import { z } from 'zod'

/**
 * Public settings, read at build time. Next.js inlines `process.env.NEXT_PUBLIC_*` only when each one is written
 * out in full, so they are listed one by one here.
 */
const schema = z.object({
  /** Where the site is served; used for absolute links and share previews. */
  NEXT_PUBLIC_SITE_URL: z.url().default('https://hashi.cash'),
  /** The docs site. */
  NEXT_PUBLIC_DOCS_URL: z.url().default('https://docs.hashi.cash'),
  /** Reown (WalletConnect) project id. Free at dashboard.reown.com; the site's domains must be allowed there. */
  NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().min(1).optional(),
  /** The source code, linked from the app's footer and the BLAZE banner. */
  NEXT_PUBLIC_REPO_URL: z.url().default('https://github.com/Blockchain-Oracle/hashi'),
  /** BCH BLAZE banner: the filled-in Widget Factory deck. The banner leaves it out until it is set. */
  NEXT_PUBLIC_BLAZE_DECK_URL: z.url().optional(),
  /** BCH BLAZE banner: the team's CashTokens address (prizes, EMBER2026 votes). Left out until it is set. */
  NEXT_PUBLIC_CASHTOKENS_ADDRESS: z
    .string()
    .regex(/^bitcoincash:z[0-9a-z]{41,}$/)
    .optional(),
})

export const env = schema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || undefined,
  NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || undefined,
  NEXT_PUBLIC_REPO_URL: process.env.NEXT_PUBLIC_REPO_URL || undefined,
  NEXT_PUBLIC_BLAZE_DECK_URL: process.env.NEXT_PUBLIC_BLAZE_DECK_URL || undefined,
  NEXT_PUBLIC_CASHTOKENS_ADDRESS: process.env.NEXT_PUBLIC_CASHTOKENS_ADDRESS || undefined,
})
