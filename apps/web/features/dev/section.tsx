import type { ReactNode } from 'react'

/** One chapter of /dev: a numbered mono label, a title, then the specimens. */
export function DevSection({
  id,
  index,
  title,
  note,
  children,
}: {
  id: string
  index: string
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-border border-t py-14">
      <p className="label-mono">
        {index} — {id}
      </p>
      <h2 className="mt-3 text-title">{title}</h2>
      {note ? <p className="mt-3 max-w-xl text-muted-foreground">{note}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  )
}
