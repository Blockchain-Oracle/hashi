import type { Metadata } from 'next'
import Link from 'next/link'
import { AssetLogo, ChainLogo } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { CrossingFeed } from '@/features/explorer/feed'
import type { ChainId } from '@/lib/constants/chains'
import { getLedger } from '@/lib/explorer/crossings.server'

const DESCRIPTION =
  'Every swap made through Hashi, live: dollars crossing between eight chains and Bitcoin Cash, each with its transactions on both chains.'

export const metadata: Metadata = {
  title: 'Explorer',
  description: DESCRIPTION,
  alternates: { canonical: '/explorer' },
  openGraph: { title: 'Hashi · Explorer', description: DESCRIPTION, url: '/explorer', type: 'website' },
}

/** Rendered per request from a ledger the server keeps at most a minute old. */
export const dynamic = 'force-dynamic'

function usd(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

/**
 * /explorer: everyone's swaps, not one person's (that is Activity). Read from NEAR Intents' records of every swap
 * carrying Hashi's referral, and from the Bitcoin Cash chain for the swap contracts' trades; nothing here comes from a
 * browser.
 */
export default async function ExplorerPage() {
  const ledger = await getLedger()
  const { crossings } = ledger
  const into = crossings.filter((c) => c.direction === 'in')
  const out = crossings.filter((c) => c.direction === 'out')
  const done = crossings.filter((c) => c.status === 'done').length
  const moved = crossings.reduce((sum, c) => sum + (c.pay.usd ?? 0), 0)
  const chains = new Map<ChainId, number>()
  for (const c of crossings) {
    const other = c.direction === 'in' ? c.pay.chain : c.get.chain
    chains.set(other, (chains.get(other) ?? 0) + 1)
  }
  const assets = new Map<string, number>()
  for (const c of crossings) {
    const bch = c.direction === 'in' ? c.get.asset : c.pay.asset
    assets.set(bch, (assets.get(bch) ?? 0) + 1)
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
      <p className="label-mono">/ Explorer</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-12">
        <h1 className="text-balance text-display">Every crossing, live.</h1>
        <p className="max-w-[44ch] text-[1.0625rem] text-foreground/70 leading-relaxed lg:pb-2">
          Every swap anyone has made through Hashi, from NEAR Intents' own records and the Bitcoin Cash chain.
          Each one links to its transactions.
        </p>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { term: 'Swaps', value: String(crossings.length) },
          { term: 'Moved', value: usd(moved) },
          {
            term: 'Completed',
            value: crossings.length ? `${Math.round((done / crossings.length) * 100)}%` : '—',
          },
          { term: 'Chains in use', value: String(chains.size) },
        ].map((stat) => (
          <div key={stat.term} className="rounded-3xl bg-card p-5 shadow-card ring-1 ring-border">
            <dt className="label-mono">{stat.term}</dt>
            <dd className="mt-2 font-medium font-mono text-[2rem] tracking-tight tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* The bridge, drawn with what crossed it: the chains on one side, Bitcoin Cash's dollars on the other. */}
      <div className="dark relative isolate mt-5 overflow-hidden rounded-[2rem] bg-[#121111] p-6 text-foreground shadow-float sm:p-8">
        <div
          aria-hidden
          className="absolute -bottom-48 left-1/2 -z-10 h-96 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_47_0/0.45),rgb(255_120_40/0.15)_55%,transparent)] blur-2xl"
        />
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_minmax(0,1.4fr)_1fr]">
          <div className="flex flex-col gap-3">
            <span className="label-mono text-foreground/50">Other chains</span>
            <div className="flex flex-wrap gap-2">
              {[...chains].map(([chain, n]) => (
                <span
                  key={chain}
                  className="inline-flex items-center gap-2 rounded-full bg-white/8 py-1 pr-3 pl-1 text-sm"
                >
                  <ChainLogo chain={chain} size={24} />
                  <span className="font-mono tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 400 140" className="w-full" aria-hidden>
            <path
              id="arch"
              d="M20 120C110 10 290 10 380 120"
              fill="none"
              stroke="#ff2f00"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M150 62V122M200 48V122M250 62V122"
              stroke="#fffaf5"
              strokeOpacity=".35"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M10 126H390"
              stroke="#fffaf5"
              strokeOpacity=".15"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {into.length ? (
              <circle r="7" fill="#fffaf5">
                <animateMotion dur="3.2s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#arch" />
                </animateMotion>
              </circle>
            ) : null}
            {out.length ? (
              <circle r="7" fill="#ff8a5c">
                <animateMotion
                  dur="3.2s"
                  begin="1.6s"
                  repeatCount="indefinite"
                  keyPoints="1;0"
                  keyTimes="0;1"
                  calcMode="linear"
                >
                  <mpath href="#arch" />
                </animateMotion>
              </circle>
            ) : null}
            <text x="200" y="104" textAnchor="middle" className="fill-[#fffaf5] font-mono text-[13px]">
              {into.length} in · {out.length} out
            </text>
          </svg>
          <div className="flex flex-col gap-3 sm:items-end">
            <span className="label-mono text-foreground/50">Bitcoin Cash</span>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {[...assets].map(([asset, n]) => (
                <span
                  key={asset}
                  className="inline-flex items-center gap-2 rounded-full bg-white/8 py-1 pr-3 pl-1 text-sm"
                >
                  <AssetLogo asset={asset as 'PUSD' | 'MUSD' | 'BCH'} size={24} />
                  <span className="font-mono tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        {crossings.length ? (
          <CrossingFeed crossings={crossings} />
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-3xl bg-muted p-6">
            <p className="text-foreground/70">
              {ledger.live
                ? 'No swaps yet. Be the first across.'
                : "The live list is off for a moment: NEAR Intents' records did not answer."}
            </p>
            <Button nativeButton={false} render={<Link href="/swap" />}>
              Open the app
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
