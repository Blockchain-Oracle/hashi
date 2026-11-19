import Link from 'next/link'
import { HashiMark } from '@/components/kit/hashi-mark'
import { env } from '@/lib/env'

const PRODUCT = [
  { href: '/swap', label: 'Swap' },
  { href: '/activity', label: 'Activity' },
  { href: '/demo', label: 'Demo' },
] as const

const BUILT_ON = [
  { href: 'https://near-intents.org', label: 'NEAR Intents' },
  { href: 'https://thorchain.org', label: 'THORChain' },
  { href: 'https://cauldron.quest', label: 'Cauldron' },
  { href: 'https://docs.riftenlabs.com/wizardconnect', label: 'WizardConnect' },
  { href: 'https://reown.com/appkit', label: 'Reown AppKit' },
  { href: 'https://paryonusd.com', label: 'ParyonUSD' },
  { href: 'https://moria.money', label: 'Moria' },
] as const

export function LandingFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pt-20 pb-12 sm:px-6">
      <div className="flex flex-col gap-10 border-border border-t pt-10 md:flex-row md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <span className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <HashiMark /> Hashi
          </span>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hashi (橋) means bridge. It never holds your money: your wallets approve every step, and the
            bridge you pick carries the swap. Hashi adds no fee of its own.
          </p>
          <a
            href="https://bchblaze.cash/bounties/stablecoin-bridge/"
            className="label-mono w-fit transition-colors hover:text-foreground"
          >
            Built for BCH BLAZE 2026 · Stablecoin Bridge
          </a>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm">
          <div className="flex flex-col gap-2.5">
            <p className="label-mono">/ Product</p>
            {PRODUCT.map((link) => (
              <Link key={link.href} href={link.href} className="w-fit transition-colors hover:text-primary">
                {link.label}
              </Link>
            ))}
            <a href={env.NEXT_PUBLIC_DOCS_URL} className="w-fit transition-colors hover:text-primary">
              Docs
            </a>
            <a href={env.NEXT_PUBLIC_REPO_URL} className="w-fit transition-colors hover:text-primary">
              Source
            </a>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="label-mono">/ Built on</p>
            {BUILT_ON.map((link) => (
              <a key={link.href} href={link.href} className="w-fit transition-colors hover:text-primary">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
