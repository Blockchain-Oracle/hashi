import type { Metadata } from 'next'
import { SwapScreen } from '@/features/swap/swap-screen'

export const metadata: Metadata = {
  title: 'Swap',
  description: 'USDC and USDT from eight chains to PUSD, MUSD or BCH on Bitcoin Cash, and back.',
}

/** The swap. `?from=USDC.base&to=PUSD&amount=25` opens it on that pair and amount, so a swap can be shared. */
export default async function SwapPage({ searchParams }: PageProps<'/swap'>) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const key of ['from', 'to', 'amount'] as const) {
    const value = params[key]
    if (typeof value === 'string') query.set(key, value)
  }
  return (
    <section className="flex flex-col items-center gap-9 pt-10 sm:pt-16">
      <div className="flex max-w-xl flex-col items-center gap-3 text-center">
        <p className="label-mono">/ Hashi · 橋 · the bridge</p>
        <h1 className="text-display text-[2.6rem] sm:text-[3.75rem]">Dollars in, dollars out.</h1>
        <p className="text-balance text-muted-foreground">
          USDC and USDT from eight chains, to PUSD, MUSD or BCH on Bitcoin Cash, and back. One screen, the
          best route, every fee shown.
        </p>
      </div>
      <SwapScreen initialQuery={query.toString()} />
    </section>
  )
}
