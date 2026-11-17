import { HomeLayout } from "fumadocs-ui/layouts/home"
import Link from "next/link"
import { HashiMark } from "@/components/hashi-mark"
import { homeOptions } from "@/lib/layout.shared"
import { DOCS } from "@/lib/site"

/** A missing page (exported as 404.html, which nginx serves for anything it can't find). */
export default function NotFound() {
  return (
    <HomeLayout {...homeOptions()}>
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
        <HashiMark size={64} />
        <p className="label-mono">/ 404</p>
        <h1 className="text-4xl font-medium tracking-[-0.04em]">No bridge here.</h1>
        <p className="max-w-sm text-fd-muted-foreground">
          This page moved or never existed. The docs start at the guide.
        </p>
        <Link
          href={DOCS.start}
          className="inline-flex h-11 items-center rounded-full bg-fd-primary px-5 text-[14px] font-semibold text-fd-primary-foreground"
        >
          Go to the guide
        </Link>
      </main>
    </HomeLayout>
  )
}
