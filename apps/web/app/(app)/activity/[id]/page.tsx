import type { Metadata } from 'next'
import { Tracker } from '@/features/activity/tracker'

export const metadata: Metadata = { title: 'Swap', robots: { index: false } }

/** One swap's live tracker. Swaps live in the browser that started them, so the page reads its id only. */
export default async function SwapTrackerPage({ params }: PageProps<'/activity/[id]'>) {
  const { id } = await params
  return <Tracker id={id} />
}
