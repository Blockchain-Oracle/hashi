import type { ElementType } from 'react'

/**
 * A headline whose words sharpen into place one after another. CSS only, so it works in server components and
 * plays before hydration: the page's largest text is never held back waiting for JavaScript.
 */
export function BlurInWords({
  as: Tag = 'h1',
  text,
  stagger = 0.08,
  className,
}: {
  as?: ElementType
  text: string
  stagger?: number
  className?: string
}) {
  const words = text.split(' ')
  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: words repeat; their order is the identity
          key={i}
          aria-hidden
          className="inline-block animate-blur-in-word whitespace-pre"
          style={{ animationDelay: `${i * stagger}s` }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}
