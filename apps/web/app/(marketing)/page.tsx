import type { Metadata } from 'next'
import { BuiltOn } from '@/features/landing/built-on'
import { Faq } from '@/features/landing/faq'
import { FinalCta } from '@/features/landing/final-cta'
import { Hero } from '@/features/landing/hero'
import { HowItWorks } from '@/features/landing/how-it-works'
import { LiveNumbers } from '@/features/landing/live-numbers'
import { Statement } from '@/features/landing/statement'
import { Trust } from '@/features/landing/trust'
import { getLandingStats } from '@/lib/landing/stats'

export const metadata: Metadata = {
  title: { absolute: 'Hashi · Dollars in, dollars out of Bitcoin Cash' },
  description:
    'Bring USDC or USDT from eight chains to Bitcoin Cash as PUSD or MUSD, and back. Every route priced with every fee, through NEAR Intents, THORChain and Cauldron.',
}

/** Rebuilt at most once a minute: every visitor gets a static page with numbers no older than that. */
export const revalidate = 60

export default async function LandingPage() {
  const stats = await getLandingStats()
  return (
    <>
      <Hero data={stats} />
      <Statement />
      <LiveNumbers data={stats} />
      <HowItWorks data={stats} />
      <Trust sample={stats.sample} />
      <BuiltOn />
      <Faq />
      <FinalCta />
    </>
  )
}
