import type { BaseLayoutProps, LinkItemType } from "fumadocs-ui/layouts/shared"
import { HashiMark } from "@/components/hashi-mark"
import { DOCS, SITE } from "./site"

/** The one filled action in the bar: into the app, in Hashi's vermilion. */
const openApp: LinkItemType = {
  type: "custom",
  secondary: true,
  children: (
    <a
      href={SITE.swap}
      className="inline-flex h-8 items-center rounded-full bg-fd-primary px-3.5 text-[13px] font-semibold whitespace-nowrap text-fd-primary-foreground transition-opacity hover:opacity-90"
    >
      Open Hashi
    </a>
  ),
}

/** The bar on every page: the mark, "Hashi docs", and the app. (GitHub joins once the repository is public.) */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2.5">
          <HashiMark size={26} />
          <span className="text-[17px] font-semibold tracking-[-0.03em]">{SITE.name}</span>
          <span className="label-mono hidden sm:inline">/ docs</span>
        </span>
      ),
      url: "/",
    },
    links: [openApp],
  }
}

/** The home page's bar also names the docs' sections (inside the docs they are the tabs). */
export function homeOptions(): BaseLayoutProps {
  const base = baseOptions()
  return {
    ...base,
    links: [
      { text: "Guide", url: DOCS.start, active: "nested-url" },
      { text: "Routes and fees", url: DOCS.routes, active: "nested-url" },
      { text: "Bitcoin Cash", url: DOCS.bch, active: "nested-url" },
      { text: "Build", url: DOCS.build, active: "nested-url" },
      openApp,
    ],
  }
}
