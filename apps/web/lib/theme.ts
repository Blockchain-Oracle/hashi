/**
 * Light and dark. A stored choice wins; with none, the site follows the device; with no preference, light.
 * The `dark` class on <html> is what shadcn's `dark:` variant and the colour tokens key off.
 */

const STORAGE_KEY = 'hashi_theme'

export type Theme = 'light' | 'dark'

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

/** Calls `onChange` whenever the theme class on <html> changes (for `useSyncExternalStore`). */
export function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

export function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function apply(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage unavailable (private mode): the choice still applies to this page.
  }
  apply(theme)
}

/** Follow the device until the person picks a theme themselves. */
export function followSystemTheme(): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (!stored()) apply(media.matches ? 'dark' : 'light')
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/**
 * Runs in <head> before the first paint, so the page never flashes the other theme. Kept tiny and
 * dependency-free; it mirrors `stored()` and the device fallback above.
 */
export const THEME_INIT_SCRIPT = `(()=>{var d=document.documentElement,t;try{t=localStorage.getItem('${STORAGE_KEY}')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.classList.toggle('dark',t==='dark');d.style.colorScheme=t})();`
