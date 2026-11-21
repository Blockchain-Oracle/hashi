import type { Crossing } from '@/lib/explorer/crossings.server'

/** A swap's status as the Explorer names it, with its dot. One list for the filter and the cards. */
export const STATUS: Record<Crossing['status'], { label: string; dot: string }> = {
  pending: { label: 'In progress', dot: 'bg-(--warning)' },
  done: { label: 'Completed', dot: 'bg-(--success)' },
  refunded: { label: 'Refunded', dot: 'bg-muted-foreground' },
  failed: { label: 'Failed', dot: 'bg-destructive' },
}
