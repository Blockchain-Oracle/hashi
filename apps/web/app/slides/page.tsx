import type { Metadata } from 'next'
import { Montserrat, Roboto, Roboto_Mono } from 'next/font/google'
import { Deck } from '@/features/slides/deck'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'

// The Widget Factory template's faces: Montserrat for the words, Roboto for the titles, Roboto Mono for the address.
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', weight: ['400', '700'] })
const roboto = Roboto({ subsets: ['latin'], variable: '--font-roboto', weight: ['700'] })
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-roboto-mono', weight: ['400'] })

const DESCRIPTION =
  "Hashi's BCH BLAZE Widget Factory deck: the story, the demos on mainnet, the benefits, how it uses Bitcoin Cash and where it goes next."

export const metadata: Metadata = {
  title: 'Widget Factory deck',
  description: DESCRIPTION,
  alternates: { canonical: '/slides' },
  openGraph: {
    title: 'Hashi · Widget Factory deck',
    description: DESCRIPTION,
    url: '/slides',
    type: 'website',
  },
}

/** /slides: the BCH BLAZE banner's presentation, full screen on Hashi's own site (the Google Slides copy is linked). */
export default function SlidesPage() {
  return (
    <Deck
      googleUrl={env.NEXT_PUBLIC_BLAZE_DECK_URL}
      fonts={cn(montserrat.variable, roboto.variable, robotoMono.variable)}
    />
  )
}
