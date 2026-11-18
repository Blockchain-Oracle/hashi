import type { Folder, Item, Node } from "fumadocs-core/page-tree"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { Diagram } from "@/components/diagram"
import { Anatomy } from "@/components/home/anatomy"
import { RouteExplorer } from "@/components/home/route-explorer"
import { Logo } from "@/components/logo-cloud"
import { DOCS, SITE } from "@/lib/site"
import { source } from "@/lib/source"

/**
 * The docs' front page. It opens on the bridge itself (pick a start and a destination, see the real route), then
 * the story in one sentence, the docs as a contents page, the swap card labelled part by part, and the system map.
 */
export default function HomePage() {
  const parts = source
    .getPageTree()
    .children.filter((n): n is Folder => n.type === "folder" && Boolean(n.root))

  return (
    <main className="flex flex-1 flex-col pb-8">
      {/* The bridge */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:pt-20">
        <p className="label-mono">/ Hashi · 橋 · the docs</p>
        <h1 className="mt-4 text-[3.25rem] leading-[0.95] font-medium tracking-[-0.05em] sm:text-[5rem] lg:text-[6rem] lg:whitespace-nowrap">
          {SITE.tagline}
        </h1>
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between md:gap-10">
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-fd-muted-foreground">
            Pick where your dollars are and where they should land. The bridge shows who carries them, in what order,
            and every approval you’ll give.
          </p>
          <Link
            href="/docs/guide/quickstart"
            className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium"
          >
            New here? Your first swap <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 sm:mt-10">
          <RouteExplorer />
        </div>
      </section>

      {/* The story, in one sentence */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:pt-32">
        <p className="label-mono">/ Why it exists</p>
        <p className="mt-5 max-w-5xl text-[1.75rem] leading-[1.3] font-medium tracking-[-0.03em] sm:text-[2.6rem] sm:leading-[1.22]">
          Most of the world’s dollars live on <Brand logo="ethereum">Ethereum</Brand>, <Brand logo="base">Base</Brand>{" "}
          and <Brand logo="solana">Solana</Brand>. Bitcoin Cash has dollars of its own,{" "}
          <Brand logo="pusd.svg">PUSD</Brand> and <Brand logo="musd.png">MUSD</Brand>, which trade only on{" "}
          <Brand logo="cauldron.png">Cauldron</Brand>.{" "}
          <span className="text-fd-muted-foreground">
            Hashi joins <Brand logo="near">NEAR Intents</Brand> and <Brand logo="thorchain">THORChain</Brand> to
            Cauldron, and prices the whole trip as one route.
          </span>
        </p>
      </section>

      {/* The docs, as a contents page */}
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-24 sm:pt-32 lg:grid-cols-[18rem_1fr] lg:gap-16">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <p className="label-mono">/ Contents</p>
          <h2 className="text-[2.25rem] leading-[1.05] font-medium tracking-[-0.04em]">
            {parts.length} parts. Start anywhere.
          </h2>
          <p className="text-[15px] text-fd-muted-foreground">
            Every page is also plain Markdown, and the whole set is one file for your AI:{" "}
            <a href="/llms-full.txt" className="font-mono text-[13px] whitespace-nowrap text-fd-foreground underline underline-offset-4">
              llms-full.txt
            </a>
          </p>
        </div>
        <ol className="flex flex-col">
          {parts.map((part, i) => (
            <Part key={part.$id ?? i} part={part} n={i + 1} />
          ))}
        </ol>
      </section>

      {/* The swap card, labelled */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:pt-32">
        <div className="mb-10 flex flex-col gap-3">
          <p className="label-mono">/ One screen</p>
          <h2 className="max-w-2xl text-[2.25rem] leading-[1.05] font-medium tracking-[-0.04em] sm:text-[2.75rem]">
            Everything happens on one card. Every part of it has a page.
          </h2>
        </div>
        <Anatomy caption="50 USDC on Ethereum → MUSD, a live quote read 18 Nov 2026, 19:13 UTC" />
      </section>

      {/* How it's built */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:pt-32">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="label-mono">/ How it’s built</p>
            <h2 className="text-[2.25rem] leading-[1.05] font-medium tracking-[-0.04em] sm:text-[2.75rem]">
              Your dollars never pass through Hashi.
            </h2>
          </div>
          <Link href={DOCS.build} className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium md:pb-1.5">
            Architecture <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <Diagram
          name="system"
          alt="Hashi's system map: Hashi in your browser above, your dollars' path from your EVM or Solana wallet through a bridge to your swap contract, which Hashi trades on Cauldron for PUSD or MUSD in your own wallet, and the services beneath"
          caption="You approve what leaves your wallets; the swap contract pays you at least the floor or sends the BCH back."
        />
      </section>

      {/* Close */}
      <section className="relative mx-auto mt-16 w-full max-w-6xl overflow-hidden px-4 pt-16 sm:mt-24">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 right-0 text-[12rem] leading-none font-medium text-fd-foreground/[0.06] select-none sm:text-[18rem]"
        >
          {SITE.kanji}
        </span>
        <div className="relative flex flex-col gap-6 border-fd-border border-t pt-10">
          <h2 className="max-w-xl text-[2.25rem] leading-[1.05] font-medium tracking-[-0.04em] sm:text-[2.75rem]">
            Hashi means bridge.
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={DOCS.start}
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-fd-foreground px-5 text-[15px] font-semibold text-fd-background"
            >
              Read the guide <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a
              href={SITE.swap}
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[15px] font-medium ring-1 ring-fd-border hover:bg-fd-muted"
            >
              Open Hashi <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

/** A brand named in running text, with its mark, as a small pill. */
function Brand({ logo, children }: { logo: string; children: ReactNode }) {
  return (
    <span className="mx-[0.05em] inline-flex items-center gap-[0.3em] rounded-full bg-fd-card py-[0.08em] pr-[0.45em] pl-[0.12em] align-[0.06em] text-[0.82em] leading-[1.25] text-fd-foreground shadow-[0_1px_0_rgb(18_17_17/0.04)] ring-1 ring-fd-border">
      <Logo name={logo} size={28} className="size-[1.05em] rounded-full" />
      {children}
    </span>
  )
}

/** One part of the docs: its number, title and line, and every page in it, grouped as in the sidebar. */
function Part({ part, n }: { part: Folder; n: number }) {
  // Each part's meta.json lists "index" first, so its front page is the first page in the tree.
  const front = part.index ?? (part.children as Node[]).find((node): node is Item => node.type === "page")
  const groups: { label?: ReactNode; pages: Item[] }[] = [{ pages: [] }]
  let count = front ? 1 : 0
  for (const node of part.children as Node[]) {
    if (node.type === "separator") groups.push({ label: node.name, pages: [] })
    else if (node.type === "page" && node.url !== front?.url) {
      groups[groups.length - 1].pages.push(node)
      count++
    }
  }

  return (
    <li className="group/part border-fd-border border-t py-7 last:border-b">
      <Link href={front?.url ?? DOCS.start} className="grid grid-cols-[2.75rem_1fr_auto] items-baseline gap-x-3">
        <span className="font-mono text-[14px] text-fd-muted-foreground tabular-nums transition-colors group-hover/part:text-[var(--vermilion-text)]">
          {String(n).padStart(2, "0")}
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[1.75rem] leading-tight font-medium tracking-[-0.03em]">{part.name}</span>
          {part.description ? <span className="text-[15px] text-fd-muted-foreground">{part.description}</span> : null}
        </span>
        <span className="font-mono text-[12px] text-fd-muted-foreground">{count} pages</span>
      </Link>
      <div className="mt-4 ml-[3.5rem] flex flex-col gap-2">
        {groups
          .filter((g) => g.pages.length > 0)
          .map((g, i) => (
            <p key={i} className="flex flex-wrap items-baseline gap-x-1 gap-y-1 text-[14px] leading-relaxed">
              {g.label ? <span className="label-mono mr-2">{g.label}</span> : null}
              {g.pages.map((page, j) => (
                <span key={page.url} className="inline-flex items-baseline">
                  <Link href={page.url} className="hover:text-[var(--vermilion-text)] hover:underline underline-offset-4">
                    {page.name}
                  </Link>
                  {j < g.pages.length - 1 ? <span className="px-1.5 text-fd-muted-foreground/60">·</span> : null}
                </span>
              ))}
            </p>
          ))}
      </div>
    </li>
  )
}
