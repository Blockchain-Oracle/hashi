import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { Icon } from '@/components/kit/icon'
import { AssetLogo, ChainLogo } from '@/components/kit/logos'
import { Button } from '@/components/ui/button'
import { Meteors } from '@/components/ui/meteors'
import { EXTERNAL_CHAIN_IDS } from '@/lib/constants/chains'

/** Each mark seated on a white coin, so the overlapping stack stays legible on ink. */
const COIN =
  'flex size-7 items-center justify-center rounded-full bg-[#fffaf5] ring-2 ring-[#121111] sm:size-9'

/** The closing chapter: a dark panel with shooting stars (Magic UI meteors, CSS-only) and one glossy action. */
export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-28 sm:px-6">
      <div className="dark relative isolate overflow-hidden rounded-[2.75rem] bg-[#121111] px-6 py-20 text-center text-foreground shadow-float sm:py-28 dark:bg-[#171616] dark:ring-1 dark:ring-white/10">
        {/* A dawn over the bridge: the vermilion horizon, and 橋 (hashi, "bridge") rising faintly behind the words. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/2 -z-10 -translate-x-1/2 select-none bg-[linear-gradient(to_bottom,rgb(255_250_245/0.09),rgb(255_250_245/0))] bg-clip-text font-medium text-[18rem] text-transparent leading-none sm:text-[26rem]"
        >
          橋
        </span>
        <div
          aria-hidden
          className="absolute -bottom-56 left-1/2 -z-10 h-[30rem] w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_47_0/0.6),rgb(255_120_40/0.22)_55%,transparent)] blur-2xl"
        />
        <Meteors number={14} className="bg-white/60 [&>div]:from-white/40" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-7">
          <div className="flex items-center">
            <span className="flex -space-x-2">
              {EXTERNAL_CHAIN_IDS.map((id) => (
                <span key={id} className={COIN}>
                  <ChainLogo chain={id} size={20} />
                </span>
              ))}
            </span>
            <Icon icon={ArrowRight01Icon} className="mx-1.5 text-foreground/50 sm:mx-2.5" />
            <span className="flex -space-x-2">
              {(['PUSD', 'MUSD', 'BCH'] as const).map((a) => (
                <span key={a} className={COIN}>
                  <AssetLogo asset={a} size={22} />
                </span>
              ))}
            </span>
          </div>
          <h2 className="text-balance font-normal text-[2.25rem] leading-[1.1] tracking-[-0.04em] sm:text-[3rem]">
            Move your first dollar to Bitcoin Cash.
          </h2>
          <p className="text-balance text-[1.0625rem] text-foreground/65">
            Pick an amount, see every route, approve in your own wallets. No account, no fee from Hashi.
          </p>
          <Button size="xl" className="w-auto px-8" nativeButton={false} render={<Link href="/swap" />}>
            Open the app
            <Icon icon={ArrowRight01Icon} />
          </Button>
        </div>
      </div>
    </section>
  )
}
