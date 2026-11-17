'use client'

import { useSyncExternalStore } from 'react'
import { currentTheme, subscribeTheme, type Theme } from '@/lib/theme'

/** The theme on screen right now; re-renders when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore<Theme>(subscribeTheme, currentTheme, () => 'light')
}
