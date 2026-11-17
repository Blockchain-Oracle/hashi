import type { Metadata, Viewport } from 'next'
import { Figtree, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { InlineScript } from '@/components/inline-script'
import { Providers } from '@/components/providers'
import { env } from '@/lib/env'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import { cn } from '@/lib/utils'
import '@/styles/index.css'

// Hashi's faces: Figtree for text, Geist Mono for amounts, addresses and labels.
const sans = Figtree({ subsets: ['latin'], variable: '--font-figtree', weight: ['400', '500', '600', '700'] })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', weight: ['400', '500'] })

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: 'Hashi', template: '%s · Hashi' },
  description: 'Move USDC and USDT from other chains to Bitcoin Cash stablecoins, PUSD and MUSD, and back.',
  openGraph: { siteName: 'Hashi', type: 'website' },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fffaf5' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0e0e' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', sans.variable, mono.variable)} suppressHydrationWarning>
      <head>
        {/* Paints the chosen theme before the first frame, so the page never flashes the other one. */}
        <InlineScript html={THEME_INIT_SCRIPT} />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
