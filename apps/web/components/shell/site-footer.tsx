import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { Icon } from '@/components/kit/icon'
import { LINKS } from '@/lib/links'

const OUTSIDE = [
  { href: LINKS.guide, label: 'How it works' },
  { href: LINKS.docs, label: 'Docs' },
  { href: LINKS.source, label: 'Source' },
] as const

/**
 * The app's footer: the way from any app page back to the home page, the docs and the source code (the nav has no
 * room for them on a phone).
 */
export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 pt-6 pb-10 text-sm sm:px-6">
      <nav aria-label="More" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <Link
          href="/"
          className="font-medium transition-colors hover:text-primary focus-visible:text-primary"
        >
          Hashi home
        </Link>
        {OUTSIDE.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary"
          >
            {link.label}
            <Icon icon={ArrowUpRight01Icon} size={14} />
          </a>
        ))}
      </nav>
      <a
        href={LINKS.bounty}
        className="label-mono transition-colors hover:text-foreground focus-visible:text-foreground"
      >
        Built for BCH BLAZE 2026 · Stablecoin Bridge
      </a>
    </footer>
  )
}
