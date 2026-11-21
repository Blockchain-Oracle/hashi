import Link from 'next/link'
import { HashiMark } from '@/components/kit/hashi-mark'
import { WalletsMenu } from '@/features/wallets/wallets-menu'
import { LINKS } from '@/lib/links'
import { ActivityLink } from './activity-link'
import { ThemeToggle } from './theme-toggle'

/**
 * The floating pill nav: a dark capsule (#171717, fully round, 50px tall) centred over the page in both
 * themes. In dark mode it lifts to a lighter ink with a hairline so it still reads as a separate object.
 */
export function SiteHeader() {
  return (
    <header className="pointer-events-none sticky top-0 z-40 flex justify-center px-4 pt-4">
      <nav className="pointer-events-auto flex h-[3.125rem] max-w-full items-center gap-0.5 rounded-full bg-[#171717] py-2 pr-2 pl-2 text-[#fffaf5] shadow-float sm:gap-1 dark:bg-[#211f1e] dark:ring-1 dark:ring-white/10">
        {/* On a phone the mark stands alone, so the pill fits a 360 px screen with both wallets connected. */}
        {/* The mark goes home, as on the landing page; Swap sits right beside it. */}
        <Link
          href="/"
          aria-label="Hashi home"
          className="mr-1 flex items-center gap-2 rounded-full font-semibold tracking-tight sm:mr-3 sm:pr-1"
        >
          <HashiMark />
          <span className="hidden sm:inline">Hashi</span>
        </Link>
        <Link
          href="/swap"
          className="rounded-full px-3 py-1.5 text-[0.9375rem] text-[#fffaf5]/70 transition-colors hover:bg-white/10 hover:text-[#fffaf5] sm:px-3.5"
        >
          Swap
        </Link>
        <ActivityLink />
        {/* Everyone's swaps (Activity is your own), from a small tablet up; on a phone it is in the footer. */}
        <Link
          href="/explorer"
          className="hidden rounded-full px-3.5 py-1.5 text-[#fffaf5]/70 text-[0.9375rem] transition-colors hover:bg-white/10 hover:text-[#fffaf5] sm:inline-flex"
        >
          Explorer
        </Link>
        {/* From a small tablet up; on a phone the docs are in the footer. */}
        <a
          href={LINKS.docs}
          className="hidden rounded-full px-3.5 py-1.5 text-[#fffaf5]/70 text-[0.9375rem] transition-colors hover:bg-white/10 hover:text-[#fffaf5] sm:inline-flex"
        >
          Docs
        </a>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        <ThemeToggle />
        <WalletsMenu />
      </nav>
    </header>
  )
}
