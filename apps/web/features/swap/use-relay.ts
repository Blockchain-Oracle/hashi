'use client'

import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const relaySchema = z.object({ enabled: z.boolean(), funded: z.boolean(), address: z.string().nullable() })

/** Whether Hashi's gas relayer can pay a USDC deposit's gas right now (set up and holding Base ETH). */
export function useRelay() {
  return useQuery({
    queryKey: ['relay'],
    queryFn: async () => relaySchema.parse(await (await fetch('/api/relay')).json()),
    staleTime: 60_000,
  })
}
