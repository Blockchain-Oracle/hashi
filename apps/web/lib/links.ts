import { env } from '@/lib/env'

/** Hashi's pages outside the app (the docs, the source, the bounty), shared by every nav, footer and banner. */
export const LINKS = {
  docs: env.NEXT_PUBLIC_DOCS_URL,
  /** "What Hashi is", the docs' first page. */
  guide: `${env.NEXT_PUBLIC_DOCS_URL}/docs/guide`,
  /** How the routes are built and ranked. */
  routes: `${env.NEXT_PUBLIC_DOCS_URL}/docs/routes`,
  source: env.NEXT_PUBLIC_REPO_URL,
  bounty: 'https://bchblaze.cash/bounties/stablecoin-bridge/',
} as const
