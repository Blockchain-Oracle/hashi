'use client'

/**
 * Next.js's documented way to run a script before the first paint (guide: "Preventing flash before hydration").
 * The server sends it as JavaScript so the browser runs it while parsing <head>; on the client React sees a
 * non-executable `text/plain` block, so it neither re-runs it nor warns about rendering a <script>. It must be a
 * client component: the switch has to evaluate again in the browser.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed script of our own with no input in it
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
