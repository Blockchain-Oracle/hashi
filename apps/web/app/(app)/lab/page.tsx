import type { Metadata } from 'next'
import { DevSection } from '@/features/dev/section'
import { ProviderStatus } from '@/features/lab/provider-status'
import { RouteBench } from '@/features/lab/route-bench'
import { WalletTests } from '@/features/lab/wallet-tests'

export const metadata: Metadata = {
  title: 'Lab',
  robots: { index: false, follow: false },
}

/** The live tests in S01. Each runs on the real engine against mainnet; the person approves every transaction. */
const TESTS = [
  [
    'T1',
    '$3 USDC (Base) → BCH via NEAR Intents',
    'Real time, BCH confirmations, real fee',
    'Needs EVM + BCH wallet',
  ],
  ['T2', '$1 USDC → BCH via NEAR Intents', 'A judge-sized swap works', 'Needs EVM + BCH wallet'],
  [
    'T3',
    '$1 of BCH → PUSD, signed in each BCH wallet',
    'Wallets sign Hashi’s Cauldron builds',
    'Needs BCH wallet',
  ],
  ['T4', 'Sell 2–3 PUSD (20–40 pools) in each wallet', 'Large transactions sign', 'Needs BCH wallet'],
  ['T5', 'PUSD → USDC in one approval', 'Whether the one-tap reverse works', 'Needs BCH wallet'],
  [
    'T6',
    'Gasless $1 USDC deposit through the relayer',
    'Gasless works with NEAR',
    'Needs relayer + EVM wallet',
  ],
  ['T7', 'BCH → PUSD with the tab closed mid-way, then resume', 'Resume path', 'Needs BCH wallet'],
  [
    'T8',
    'THORChain via Ethereum USDC, both ways (optional)',
    'Second route end to end',
    'Needs EVM + BCH wallet',
  ],
] as const

export default function LabPage() {
  return (
    <div className="mx-auto w-full max-w-6xl pt-14">
      <p className="label-mono">/ Lab — live mainnet bench</p>
      <h1 className="mt-4 text-display">Every route, priced live.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
        The real engine against mainnet: NEAR Intents and THORChain for the bridge, Cauldron for PUSD and
        MUSD. Pricing moves nothing. Every test that moves money waits for your approval in your own wallet.
      </p>

      <div className="mt-12">
        <DevSection
          id="services"
          index="01"
          title="Services"
          note="Each checked on its own, every 30 seconds."
        >
          <ProviderStatus />
        </DevSection>
        <DevSection
          id="routes"
          index="02"
          title="Routes"
          note="Both providers priced end to end, with every fee the providers leave out added back."
        >
          <RouteBench />
        </DevSection>
        <DevSection
          id="wallets"
          index="03"
          title="Wallets"
          note="Connect your own wallets. Every transaction is shown in your wallet and runs only when you approve it there."
        >
          <WalletTests />
        </DevSection>
        <DevSection
          id="tests"
          index="04"
          title="Live tests"
          note="Run with real money once wallets are connected."
        >
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            {TESTS.map(([id, what, settles, needs]) => (
              <div
                key={id}
                className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-1 border-border border-b p-4 last:border-b-0 sm:grid-cols-[3rem_1fr_1fr_12rem]"
              >
                <span className="font-mono text-primary">{id}</span>
                <span className="font-medium">{what}</span>
                <span className="col-start-2 text-muted-foreground text-sm sm:col-start-auto">{settles}</span>
                <span className="col-start-2 font-mono text-muted-foreground text-xs sm:col-start-auto sm:text-right">
                  {needs}
                </span>
              </div>
            ))}
          </div>
        </DevSection>
      </div>
    </div>
  )
}
