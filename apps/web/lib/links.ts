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
  /** The 2:40 demo: Abu's intro, then real mainnet swaps both ways (also at hashi.cash/demo). */
  demo: 'https://youtu.be/bbLQ44UAdBU',
} as const

/** Hashi's logo as a full URL (public/icon-512.png), for wallets that show the app on their own screens. */
export function appIconUrl(): string {
  const origin = typeof window === 'undefined' ? env.NEXT_PUBLIC_SITE_URL : window.location.origin
  return new URL('/icon-512.png', origin).href
}
