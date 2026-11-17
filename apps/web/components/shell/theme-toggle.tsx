'use client'

import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { setTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useTheme } from './use-theme'

/**
 * Magic UI's animated theme toggler (the new theme spreads from the button in a circle), controlled by Hashi's own
 * theme store so the choice is saved under Hashi's key and follows the device until the person picks.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme()
  return (
    <AnimatedThemeToggler
      theme={theme}
      onThemeChange={setTheme}
      duration={500}
      aria-label="Switch between light and dark"
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full text-current/70 transition-colors hover:bg-white/10 hover:text-current [&_svg]:size-[18px]',
        className,
      )}
    />
  )
}
