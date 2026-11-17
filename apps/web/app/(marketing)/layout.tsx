import type { ReactNode } from 'react'
import { LandingFooter } from '@/features/landing/landing-footer'
import { LandingHeader } from '@/features/landing/landing-header'

/** The public pages. No wallet providers here: the landing page loads no wallet code. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <LandingHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <LandingFooter />
    </div>
  )
}
