import Link from 'next/link'
import { HashiMark } from '@/components/kit/hashi-mark'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'

const LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#live', label: 'Live' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/demo', label: 'Demo' },
  { href: '/explorer', label: 'Explorer' },
  { href: env.NEXT_PUBLIC_DOCS_URL, label: 'Docs' },
] as const

/**
 * The landing page's nav: the same floating dark pill as the app, with section links and one
 * vermilion way into the app. No wallet code loads here.
 */
export function LandingHeader() {
  return (
    <header className="pointer-events-none sticky top-0 z-40 flex justify-center px-4 pt-4">
      <nav className="pointer-events-auto flex h-[3.125rem] items-center gap-1 rounded-full bg-[#171717] py-2 pr-2 pl-2 text-[#fffaf5] shadow-float dark:bg-[#211f1e] dark:ring-1 dark:ring-white/10">
        <Link
          href="/"
          className="mr-2 flex items-center gap-2 rounded-full pr-1 font-semibold tracking-tight"
        >
          <HashiMark />
          Hashi
        </Link>
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-full px-3 py-1.5 text-[#fffaf5]/70 text-[0.9375rem] transition-colors hover:bg-white/10 hover:text-[#fffaf5] max-sm:hidden"
          >
            {link.label}
          </a>
        ))}
        <ThemeToggle className="ml-1" />
        <Button size="sm" className="ml-1 rounded-full" nativeButton={false} render={<Link href="/swap" />}>
          Open app
        </Button>
      </nav>
    </header>
  )
}
