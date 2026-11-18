import type { Metadata, Viewport } from "next"
import { Figtree, Geist_Mono } from "next/font/google"
import { BlazeBanner } from "@/components/blaze"
import { Provider } from "@/components/provider"
import { OG, SITE } from "@/lib/site"
import "./global.css"

// The app's faces: Figtree for reading and titles, Geist Mono for amounts, addresses and the "/ LABEL" lines.
const sans = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree" })
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.title} · ${SITE.tagline}`, template: `%s · ${SITE.title}` },
  description: SITE.description,
  applicationName: SITE.title,
  openGraph: {
    siteName: SITE.title,
    type: "website",
    images: [{ url: "/og/home.png", width: OG.width, height: OG.height }],
  },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFAF5" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0E0E" },
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} font-sans`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>
          <BlazeBanner />
          {children}
        </Provider>
      </body>
    </html>
  )
}
