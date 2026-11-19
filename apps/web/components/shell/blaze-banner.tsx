import { BrandQr } from '@/components/kit/brand-qr'
import { env } from '@/lib/env'
import { LINKS } from '@/lib/links'
import { CashTokensQr } from './cashtokens-qr'

/**
 * The BCH BLAZE banner every entry carries at the top of its home page: the Widget Factory deck, the source code
 * and the team's CashTokens address (BLAZE sends prizes there; EMBER2026 holders vote by sending tokens there). The
 * deck and the address appear once they are set (NEXT_PUBLIC_BLAZE_DECK_URL, NEXT_PUBLIC_CASHTOKENS_ADDRESS).
 */
export function BlazeBanner() {
  const deck = env.NEXT_PUBLIC_BLAZE_DECK_URL
  const address = env.NEXT_PUBLIC_CASHTOKENS_ADDRESS
  return (
    <aside
      aria-label="BCH BLAZE 2026"
      className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 bg-[#121111] px-4 py-2 text-[#fffaf5] text-xs"
    >
      <a
        href={LINKS.bounty}
        className="font-mono text-[#fffaf5]/70 uppercase tracking-[0.08em] transition-colors hover:text-[#fffaf5]"
      >
        BCH BLAZE 2026 · Stablecoin Bridge
      </a>
      <a
        href={LINKS.demo}
        className="underline decoration-white/30 underline-offset-4 hover:decoration-white"
      >
        Watch the demo
      </a>
      {deck ? (
        <a href={deck} className="underline decoration-white/30 underline-offset-4 hover:decoration-white">
          Widget Factory deck ↗
        </a>
      ) : null}
      <a
        href={LINKS.source}
        className="underline decoration-white/30 underline-offset-4 hover:decoration-white"
      >
        Source code ↗
      </a>
      {address ? (
        <CashTokensQr address={address} qr={<BrandQr value={address} label={`QR code for ${address}`} />} />
      ) : null}
    </aside>
  )
}
