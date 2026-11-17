'use client'

import Link from 'next/link'
import { inProgress, useExpirySweep, useSwapRecords } from '@/features/activity/store'

/** "Activity" in the nav, with a count of swaps still on their way (quotes that ran out are ended first). */
export function ActivityLink() {
  const records = useSwapRecords()
  useExpirySweep()
  const active = inProgress(records.data).length
  return (
    <Link
      href="/activity"
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 sm:px-3.5 text-[#fffaf5]/70 text-[0.9375rem] transition-colors hover:bg-white/10 hover:text-[#fffaf5]"
    >
      Activity
      {active ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-[#ff2f00] font-mono text-[0.6875rem] text-white">
          {active}
        </span>
      ) : null}
    </Link>
  )
}
