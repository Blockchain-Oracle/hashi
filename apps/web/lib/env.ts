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
})

export const env = schema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || undefined,
  NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || undefined,
})
