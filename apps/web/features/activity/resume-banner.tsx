'use client'

import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { Icon } from '@/components/kit/icon'
import { AssetOnChain } from '@/components/kit/logos'
import type { SwapRecord } from '@/lib/engine/swap'
import { cn } from '@/lib/utils'
import { receiveSide } from './steps'
import { inProgress, useSwapRecords } from './store'

/** Which unfinished swap matters most: one waiting for the person's approval first, then one on its way. */
function pick(records: SwapRecord[]): { record: SwapRecord; text: string; urgent: boolean } | undefined {
  const finish = records.find((r) => r.status === 'bch-arrived' || r.status === 'swapping')
  if (finish)
    return { record: finish, text: `Your BCH arrived. Finish: swap it into ${finish.bchAsset}`, urgent: true }
  // Expired quotes are already out of this list (an end state), so every quoted swap here is still usable.
  const sold = records.find((r) => r.status === 'quoted' && r.cauldronTxid)
  if (sold) return { record: sold, text: `${sold.bchAsset} sold: send the BCH on`, urgent: true }
  const deposit = records.find((r) => r.status === 'quoted')
  if (deposit) return { record: deposit, text: 'A swap is waiting for its deposit', urgent: true }
  const moving = records.filter((r) => r.status === 'deposit-sent' || r.status === 'bridging')
  const first = moving[0]
  if (first) {
    return {
      record: first,
      text: moving.length === 1 ? 'A swap is on its way' : `${moving.length} swaps are on their way`,
      urgent: false,
    }
  }
  return undefined
}

/** An unfinished swap is one click away from the swap screen. */
export function ResumeBanner() {
  const records = useSwapRecords()
  const shown = pick(inProgress(records.data))
  if (!shown) return null
  const receive = receiveSide(shown.record)
  return (
    <Link
      href={`/activity/${shown.record.id}`}
      className={cn(
        'flex w-full max-w-[30rem] items-center gap-3 rounded-full py-2 pr-4 pl-2 text-sm shadow-card ring-1 transition-colors',
        shown.urgent
          ? 'bg-primary/10 ring-primary/30 hover:bg-primary/15'
          : 'bg-card ring-border hover:bg-muted',
      )}
    >
      <AssetOnChain asset={receive.symbol} chain={receive.chain} size={28} />
      <span className="min-w-0 flex-1 truncate font-medium">{shown.text}</span>
      <Icon icon={ArrowRight01Icon} className="text-muted-foreground" />
    </Link>
  )
}
