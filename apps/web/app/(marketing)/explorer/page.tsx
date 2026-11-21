import type { Metadata } from 'next'
import Link from 'next/link'
import { AssetLogo, ChainLogo } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { CrossingList } from '@/features/explorer/list'
import { ExplorerToolbar } from '@/features/explorer/toolbar'
import type { ChainId } from '@/lib/constants/chains'
import { getLedger, queryLedger, STATUSES } from '@/lib/explorer/crossings.server'

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
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const asked = await searchParams
  const ledger = await getLedger()
  const dir = one(asked.dir)
  const status = STATUSES.find((s) => s === one(asked.status))
  const result = queryLedger(ledger.crossings, {
    q: one(asked.q),
    dir: dir === 'in' || dir === 'out' ? dir : undefined,
    chain: one(asked.chain),
    coin: one(asked.coin),
    status,
    page: Number(one(asked.page)) || 1,
  })
  const { crossings } = ledger
  const into = crossings.filter((c) => c.direction === 'in')
  const out = crossings.filter((c) => c.direction === 'out')
  const done = crossings.filter((c) => c.status === 'done').length
  // Of the swaps that have ended: one still crossing is not a failure.
  const ended = crossings.filter((c) => c.status !== 'pending').length
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
            value: ended ? `${Math.round((done / ended) * 100)}%` : '—',
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
        <div className="grid grid-cols-2 items-center gap-x-4 gap-y-5 sm:grid-cols-[1fr_minmax(0,1.4fr)_1fr] sm:gap-6">
          <div className="order-1 flex flex-col gap-3">
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
          <div className="order-3 col-span-2 flex flex-col items-center gap-4 sm:order-2 sm:col-span-1">
            <svg viewBox="0 0 520 170" className="w-full" aria-hidden>
              {/* Two lanes over one bridge: into Bitcoin Cash above, out of it below. */}
              <path
                id="lane-in"
                d="M24 150C130 18 390 18 496 150"
                fill="none"
                stroke="#ff2f00"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                id="lane-out"
                d="M496 150C400 52 120 52 24 150"
                fill="none"
                stroke="#fffaf5"
                strokeOpacity=".55"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="2 12"
              />
              <path
                d="M190 74V156M260 66V156M330 74V156"
                stroke="#fffaf5"
                strokeOpacity=".22"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M8 160H512"
                stroke="#fffaf5"
                strokeOpacity=".14"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {into.length ? (
                <>
                  <circle r="8" fill="#fffaf5">
                    <animateMotion dur="3.6s" repeatCount="indefinite">
                      <mpath href="#lane-in" />
                    </animateMotion>
                  </circle>
                  <circle r="8" fill="#fffaf5" opacity="0">
                    <set attributeName="opacity" to=".5" begin="1.8s" />
                    <animateMotion dur="3.6s" begin="1.8s" repeatCount="indefinite">
                      <mpath href="#lane-in" />
                    </animateMotion>
                  </circle>
                </>
              ) : null}
              {out.length ? (
                <circle r="6" fill="#ff8a5c" opacity="0">
                  <set attributeName="opacity" to="1" begin="0.9s" />
                  <animateMotion dur="4.4s" begin="0.9s" repeatCount="indefinite">
                    <mpath href="#lane-out" />
                  </animateMotion>
                </circle>
              ) : null}
            </svg>
            <div className="flex flex-nowrap justify-center gap-2 font-mono text-xs">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ff2f00] px-3 py-1.5 text-[#fffaf5]">
                <b className="font-semibold text-sm">{into.length}</b>
                <span>
                  IN<span className="max-sm:hidden">TO BITCOIN CASH</span> →
                </span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                ←<b className="font-semibold text-sm">{out.length}</b>
                <span>
                  OUT<span className="max-sm:hidden"> TO OTHER CHAINS</span>
                </span>
              </span>
            </div>
          </div>
          <div className="order-2 flex flex-col items-end gap-3 sm:order-3">
            <span className="label-mono text-foreground/50">Bitcoin Cash</span>
            <div className="flex flex-wrap justify-end gap-2">
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

      <div className="mt-12 flex flex-col gap-5">
        {crossings.length ? (
          <>
            <ExplorerToolbar
              chains={result.chains}
              coins={result.coins}
              statuses={result.statuses}
              counts={{ all: crossings.length, in: into.length, out: out.length }}
            />
            <CrossingList
              rows={result.rows}
              total={result.total}
              page={result.page}
              pages={result.pages}
              pageSize={result.pageSize}
            />
          </>
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
