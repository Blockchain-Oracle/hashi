import { ArrowRight01Icon, ArrowUpRight01Icon, PlayIcon } from '@hugeicons/core-free-icons'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/kit/icon'
import { BrandLogo, ChainLogo } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { FinalCta } from '@/features/landing/final-cta'
import { clock, type Film, PUBLISHED, receiptUrl } from '@/lib/demo'
import { LINKS } from '@/lib/links'
import { cn } from '@/lib/utils'

const DESCRIPTION =
  'Watch Hashi move real dollars between Base and Bitcoin Cash on mainnet, then open every transaction the videos made.'

export const metadata: Metadata = {
  title: 'Demo',
  description: DESCRIPTION,
  alternates: { canonical: '/demo' },
  openGraph: { title: 'Hashi · the demo', description: DESCRIPTION, url: '/demo', type: 'website' },
}

const seconds = (length: string) => {
  const [m = 0, s = 0] = length.split(':').map(Number)
  return m * 60 + s
}

const href = (film: Film, at?: number) =>
  `/demo?film=${film.key}${at === undefined ? '' : `&t=${at}`}#film` as Route

/**
 * /demo: the videos, played here from YouTube (the no-cookie player, so nothing is set until Play), with chapters
 * that are links (/demo?film=film&t=58), so a moment can be shared and the player starts there. The page reads
 * `film` and `t` on the server, so the right player is in the HTML it sends. Then every transaction the videos made.
 */
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ film?: string; t?: string }>
}) {
  const asked = await searchParams
  const film = PUBLISHED.find((f) => f.key === asked.film) ?? PUBLISHED[0]
  if (!film) return null
  const t = Number(asked.t)
  const start = Number.isInteger(t) && t > 0 && t < seconds(film.length) ? t : null
  const playing = film.chapters.findLast((c) => start !== null && c.at <= start)
  const src = `https://www.youtube-nocookie.com/embed/${film.videoId}?rel=0${
    start === null ? '' : `&start=${start}&autoplay=1`
  }`

  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
        <p className="label-mono">/ The demo</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-12">
          <h1 className="text-balance text-display">Real dollars, moved on camera.</h1>
          <div className="flex flex-col gap-5 lg:pb-2">
            <p className="max-w-[44ch] text-[1.0625rem] text-foreground/70 leading-relaxed">
              Recorded on mainnet with real wallets. Every swap in the videos is a transaction you can open
              below.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" nativeButton={false} render={<Link href="/swap" />}>
                Open the app
                <Icon icon={ArrowRight01Icon} />
              </Button>
              <Button size="lg" variant="secondary" nativeButton={false} render={<a href={LINKS.docs} />}>
                Read the docs
              </Button>
            </div>
          </div>
        </div>

        {PUBLISHED.length > 1 ? (
          <nav aria-label="Videos" className="mt-10 flex flex-wrap gap-2">
            {PUBLISHED.map((f) => (
              <Link
                key={f.key}
                href={href(f)}
                scroll={false}
                aria-current={f === film ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-full px-4 py-2.5 font-medium text-[0.9375rem] transition-colors',
                  f === film ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/70',
                )}
              >
                <Icon icon={PlayIcon} className="size-4" />
                {f.title}
                <span className="font-mono text-xs opacity-60">{f.length}</span>
              </Link>
            ))}
          </nav>
        ) : null}

        <div
          id="film"
          className="dark relative isolate mt-5 scroll-mt-24 overflow-hidden rounded-[2rem] bg-[#121111] p-3 text-foreground shadow-float sm:rounded-[2.25rem] sm:p-5"
        >
          <div
            aria-hidden
            className="absolute -bottom-48 left-1/2 -z-10 h-96 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_47_0/0.45),rgb(255_120_40/0.15)_55%,transparent)] blur-2xl"
          />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
            <figure className="flex min-w-0 flex-col gap-3">
              {/* YouTube refuses an embed that arrives without a referrer (error 153); the site sends its origin. */}
              <iframe
                key={`${film.key}-${start ?? 'top'}`}
                className="aspect-video w-full rounded-[1.25rem] bg-black sm:rounded-[1.5rem]"
                src={src}
                title={`Hashi: ${film.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-foreground/65 text-sm">
                <span>{film.blurb}</span>
                <a
                  href={`https://youtu.be/${film.videoId}`}
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                >
                  Watch on YouTube <Icon icon={ArrowUpRight01Icon} className="size-4" />
                </a>
              </figcaption>
            </figure>

            <nav aria-label="Chapters" className="flex min-w-0 flex-col">
              <span className="px-2 pb-2 font-mono text-[0.6875rem] text-foreground/50 uppercase tracking-[0.08em]">
                Chapters · {film.length}
              </span>
              <ol className="flex flex-col">
                {film.chapters.map((c) => {
                  const on = c === playing
                  return (
                    <li key={c.at}>
                      <Link
                        href={href(film, c.at)}
                        scroll={false}
                        replace
                        aria-current={on ? 'true' : undefined}
                        className={cn(
                          'flex items-baseline gap-3 rounded-xl px-2 py-2 text-[0.9375rem] leading-snug transition-colors',
                          on
                            ? 'bg-white/12 text-foreground'
                            : 'text-foreground/75 hover:bg-white/8 hover:text-foreground',
                        )}
                      >
                        <span className="inline-flex w-11 shrink-0 items-center gap-1 font-mono text-[#ff7a4d] text-xs">
                          {on ? <Icon icon={PlayIcon} className="size-3" /> : null}
                          {clock(c.at)}
                        </span>
                        <span>{c.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </nav>
          </div>
        </div>
      </section>

      <section id="receipts" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6">
        <p className="label-mono">/ On chain</p>
        <h2 className="mt-5 max-w-2xl text-balance text-title">Don't trust the video. Open the receipts.</h2>
        <div className="mt-10 flex flex-col gap-12">
          {PUBLISHED.map((f) => (
            <div key={f.key} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between gap-4 font-mono text-[0.6875rem] text-muted-foreground uppercase tracking-[0.08em]">
                <span>
                  {f.title} · recorded {f.recorded}
                </span>
                <span className="max-sm:hidden">Transaction</span>
              </div>
              {f.receipts.map((r) => (
                <a
                  key={r.id}
                  href={receiptUrl(r.chain, r.id)}
                  className="group grid gap-2 border-border border-t py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:px-3"
                >
                  <span className="max-sm:hidden">
                    {r.chain === 'near' ? (
                      <BrandLogo brand="near" size={22} />
                    ) : (
                      <ChainLogo chain={r.chain} size={22} />
                    )}
                  </span>
                  <span className="text-[1rem] leading-snug">{r.what}</span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-primary text-sm">
                    {r.id.slice(0, r.id.startsWith('0x') ? 10 : 8)}…
                    <Icon
                      icon={ArrowUpRight01Icon}
                      className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </section>

      <FinalCta />
    </>
  )
}
