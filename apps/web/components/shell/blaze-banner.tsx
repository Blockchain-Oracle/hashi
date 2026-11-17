import { CopyButton } from '@/components/kit/copy-button'
import { env } from '@/lib/env'
import { shortAddress } from '@/lib/format'
import { LINKS } from '@/lib/links'

/**
 * The BCH BLAZE banner every entry carries at the top of its home page: the Widget Factory deck, the source code
 * and the team's CashTokens address (prizes, EMBER2026 community votes and the TokenHunt airdrop go there). The
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
        <span className="flex items-center gap-1">
          <span className="text-[#fffaf5]/70">CashTokens</span>
          <span className="font-mono" title={address}>
            {shortAddress(address.replace('bitcoincash:', ''), 8, 6)}
          </span>
          <CopyButton value={address} label="Copy the CashTokens address" className="size-6 text-[#fffaf5]" />
        </span>
      ) : null}
    </aside>
  )
}
