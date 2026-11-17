import type { Metadata } from 'next'
import { ActivityList } from '@/features/activity/activity-list'

export const metadata: Metadata = { title: 'Activity', description: 'Your Hashi swaps, checked live.' }

export default function ActivityPage() {
  return <ActivityList />
}
