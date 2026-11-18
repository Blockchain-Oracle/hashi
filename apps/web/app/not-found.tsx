import type { Metadata } from 'next'
import Link from 'next/link'
import { HashiMark } from '@/components/kit/hashi-mark'
import { Button } from '@/components/ui/button'
import { LINKS } from '@/lib/links'

export const metadata: Metadata = { title: 'Page not found' }

/**
 * Any address the app does not have. Hashi means bridge, so the page draws one that stops short of the far bank:
 * two vermilion spans with open air between them. Its own small header (the landing's links point at sections of
 * the home page, which this is not) and no wallet code.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <header className="flex justify-center px-4 pt-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Hashi home">
          <HashiMark />
          <span className="font-semibold text-[1.0625rem] tracking-[-0.03em]">Hashi</span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
        <svg viewBox="0 0 320 96" className="w-[min(20rem,80vw)]" aria-hidden>
          {/* The near span and the far span of one arch; the crown between them is gone. */}
          <path
            d="M14 84C40 40 84 16 132 12"
            fill="none"
            stroke="var(--vermilion)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M188 12C236 16 280 40 306 84"
            fill="none"
            stroke="var(--vermilion)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Posts under each span, and the waterline. */}
          <path
            d="M52 50v34M92 27v57M228 27v57M268 50v34"
            stroke="var(--vermilion)"
            strokeOpacity="0.45"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M4 90H316"
            stroke="currentColor"
            strokeOpacity="0.14"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <p className="label-mono">/ 404</p>
        <h1 className="text-balance font-normal text-[2.25rem] leading-[1.1] tracking-[-0.04em] sm:text-[3rem]">
          No bridge here.
        </h1>
        <p className="max-w-sm text-muted-foreground">
          This page moved or never existed. The swap is one step away.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button size="lg" nativeButton={false} render={<Link href="/swap" />}>
            Open the swap
          </Button>
          <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/" />}>
            Hashi home
          </Button>
        </div>
        <a
          href={LINKS.docs}
          className="text-muted-foreground text-sm underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground"
        >
          Read the docs ↗
        </a>
      </main>
    </div>
  )
}
