'use client'

import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { useState } from 'react'
import { Icon } from '@/components/kit/icon'
import { Button } from '@/components/ui/button'
import { ReviewDialog } from '@/features/swap/review-dialog'
import { TokenPicker } from '@/features/swap/token-picker'
import { useSwap } from '@/features/swap/use-swap'
import { useBchWallet } from '@/features/wallets/bch-wallet'
import { toTokenAddress } from '@/lib/bch/address'
import { PLACEHOLDER_ADDRESS } from '@/lib/engine/placeholders'

const LIVE_QUERY = new URLSearchParams({ from: 'USDC.ethereum', to: 'PUSD', amount: '50' })
const LOCAL_QUERY = new URLSearchParams({ from: 'PUSD', to: 'MUSD', amount: '10' })

/**
 * The swap screen's overlays, openable without wallets. The reviews run on live quotes (50 USDC on Ethereum → PUSD
 * through a bridge, and 10 PUSD → MUSD on Cauldron alone); only their addresses are specimens (addresses nobody
 * controls), because the real review needs the wallets connected.
 */
export function SwapScreenDemo() {
  const swap = useSwap(LIVE_QUERY, { syncUrl: false })
  const { openConnect } = useBchWallet()
  const local = useSwap(LOCAL_QUERY, { syncUrl: false })
  const [review, setReview] = useState(false)
  const [localReview, setLocalReview] = useState(false)
  const [picker, setPicker] = useState(false)
  const specimen = {
    ...swap,
    addresses: {
      stableSide: PLACEHOLDER_ADDRESS.evm,
      bchPlain: PLACEHOLDER_ADDRESS.bch,
      bchToken: toTokenAddress(PLACEHOLDER_ADDRESS.bch),
    },
  }
  const localSpecimen = {
    ...local,
    addresses: { bchPlain: PLACEHOLDER_ADDRESS.bch, bchToken: toTokenAddress(PLACEHOLDER_ADDRESS.bch) },
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => setReview(true)} disabled={!swap.selected}>
        {swap.selected ? 'Review sheet (live quote)' : 'Pricing 50 USDC → PUSD…'}
      </Button>
      <Button variant="soft" onClick={() => setLocalReview(true)} disabled={!local.selected}>
        {local.selected ? 'Review: PUSD → MUSD on Cauldron (live)' : 'Pricing 10 PUSD → MUSD…'}
      </Button>
      <Button variant="secondary" onClick={openConnect}>
        WizardConnect dialog
      </Button>
      <Button variant="outline" onClick={() => setPicker(true)}>
        Token picker
      </Button>
      <Button
        variant="ghost"
        nativeButton={false}
        render={<Link href="/swap?from=USDC.base&to=PUSD&amount=25" />}
      >
        Open /swap
        <Icon icon={ArrowUpRight01Icon} />
      </Button>
      <ReviewDialog swap={specimen} open={review} onOpenChange={setReview} onConfirm={() => {}} confirming />
      <ReviewDialog
        swap={localSpecimen}
        open={localReview}
        onOpenChange={setLocalReview}
        onConfirm={() => {}}
        confirming
      />
      <TokenPicker
        open={picker}
        onOpenChange={setPicker}
        side="pay"
        currentKey="USDC.ethereum"
        other={{ kind: 'bch', id: 'PUSD' }}
        fallback="PUSD"
        onPick={() => {}}
        balances={swap.balances}
        prices={swap.prices}
      />
    </div>
  )
}
