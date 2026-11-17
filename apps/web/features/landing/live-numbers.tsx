import { AssetLogo, BrandLogo } from '@/components/kit/logos'
import { StatusPill } from '@/components/kit/status-pill'
import { CHAINS } from '@/lib/constants/chains'
import type { LandingStats, TokenMarket } from '@/lib/landing/stats'
import { cn } from '@/lib/utils'

const usd0 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usd4 = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })

interface Stat {
  key: string
  label: string
  value: string | undefined
  foot: React.ReactNode
  candy: string
  tilt: string
  asset?: 'PUSD' | 'MUSD' | 'BCH'
}

function stats(markets: TokenMarket[], bchUsd: number | undefined): Stat[] {
  const pusd = markets.find((m) => m.id === 'PUSD')
  const musd = markets.find((m) => m.id === 'MUSD')
  return [
    {
      key: 'pusd-liquidity',
      label: 'PUSD liquidity on Cauldron',
      value: pusd && usd0(pusd.liquidityUsd),
      foot: pusd ? `${pusd.pools} pools · 1 PUSD = ${usd4(pusd.priceUsd)}` : 'Unavailable right now',
      candy: 'candy-violet',
      tilt: 'lg:-rotate-2',
      asset: 'PUSD',
    },
    {
      key: 'pusd-volume',
      label: 'PUSD traded in the last 24\u00a0h',
      value: pusd && usd0(pusd.volume24hUsd),
      foot: 'BCH side of every Cauldron trade',
      candy: 'candy-green',
      tilt: 'lg:rotate-1 lg:translate-y-4',
      asset: 'PUSD',
    },
    {
      key: 'musd-liquidity',
      label: 'MUSD liquidity on Cauldron',
      value: musd && usd0(musd.liquidityUsd),
      foot: musd ? `${musd.pools} pools · 1 MUSD = ${usd4(musd.priceUsd)}` : 'Unavailable right now',
      candy: 'candy-amber',
      tilt: 'lg:-rotate-1',
      asset: 'MUSD',
    },
    {
      key: 'bch',
      label: 'Bitcoin Cash',
      value:
        bchUsd === undefined
          ? undefined
          : bchUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      foot: 'Priced by NEAR Intents',
      candy: 'candy-ink',
      tilt: 'lg:rotate-2 lg:translate-y-2',
      asset: 'BCH',
    },
  ]
}

/**
 * Real numbers, read from Cauldron's indexer and the bridges when the page was built (it rebuilds every minute):
 * tilted candy stat cards with large mono figures.
 */
export function LiveNumbers({ data }: { data: LandingStats }) {
  const paused = data.status.thorchainPaused
    ?.map((code) => Object.values(CHAINS).find((c) => c.thorchainChain === code)?.name ?? code)
    .filter(Boolean)
  return (
    <section id="live" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pt-28 sm:px-6">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="flex max-w-xl flex-col gap-3">
          <p className="label-mono">/ Live from the chain</p>
          <h2 className="text-title text-balance">Real liquidity. Real routes. Checked every minute.</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            tone={data.status.near ? 'success' : 'error'}
            icon={<BrandLogo brand="near" size={16} />}
          >
            NEAR Intents {data.status.near ? 'live' : 'unreachable'}
          </StatusPill>
          <StatusPill
            tone={paused === undefined ? 'ink' : paused.length ? 'warning' : 'success'}
            icon={<BrandLogo brand="thorchain" size={16} />}
          >
            THORChain{' '}
            {paused === undefined ? 'unknown' : paused.length ? `paused on ${paused.join(', ')}` : 'live'}
          </StatusPill>
          <StatusPill
            tone={data.status.cauldron ? 'success' : 'error'}
            icon={<BrandLogo brand="cauldron" size={16} />}
          >
            Cauldron {data.status.cauldron ? 'live' : 'unreachable'}
          </StatusPill>
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats(data.markets, data.bchUsd).map((s) => (
          <div
            key={s.key}
            className={cn(
              'flex min-h-44 flex-col justify-between gap-6 rounded-[1.75rem] sm:min-h-56 p-6 text-white shadow-float transition-transform duration-500 hover:rotate-0',
              s.candy,
              s.tilt,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="max-w-40 font-medium text-white/85 leading-snug">{s.label}</p>
              {s.asset ? (
                <span className="rounded-full bg-white/90 p-1 shadow-card">
                  <AssetLogo asset={s.asset} size={26} />
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[2.25rem] leading-none tracking-[-0.04em] sm:text-[2.5rem]">
                {s.value ?? '—'}
              </p>
              <p className="text-sm text-white/75">{s.foot}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-muted-foreground text-sm">
        Sources: Cauldron’s pool indexer (pools, prices, 24 h volume), NEAR Intents’ token list (BCH price),
        THORChain’s inbound addresses (halts). Last checked{' '}
        {new Date(data.checkedAt).toLocaleTimeString('en-GB', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        UTC.
      </p>
    </section>
  )
}
