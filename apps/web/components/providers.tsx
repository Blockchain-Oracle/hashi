'use client'

import { environmentManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useEffect } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { followSystemTheme } from '@/lib/theme'

/**
 * TanStack Query's recommended setup for the App Router: a fresh client per server render, one shared client in
 * the browser (so a suspending render never throws the cache away). Live data sets its own freshness per query.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000 },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()
  useEffect(() => followSystemTheme(), [])
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider position="bottom-right">{children}</ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
