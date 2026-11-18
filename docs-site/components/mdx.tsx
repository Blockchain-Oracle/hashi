import { Accordion, Accordions } from "fumadocs-ui/components/accordion"
import { File, Files, Folder } from "fumadocs-ui/components/files"
import { ImageZoom } from "fumadocs-ui/components/image-zoom"
import { Step, Steps } from "fumadocs-ui/components/steps"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { TypeTable } from "fumadocs-ui/components/type-table"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { icons } from "lucide-react"
import type { MDXComponents } from "mdx/types"
import type { ComponentProps } from "react"
import { BRANDS, WALLETS } from "@/lib/brands"
import { CashTokensCard } from "./blaze"
import { IntoFigure } from "./figures/into-figure"
import { OnFigure } from "./figures/on-figure"
import { OutFigure } from "./figures/out-figure"
import { SystemFigure } from "./figures/system-figure"
import { HashiMark } from "./hashi-mark"
import { Logo, LogoCloud } from "./logo-cloud"
import { Phone, Phones, Sheet, Shot } from "./phone"
import { Quote, RouteCard } from "./route-card"

/** Every service, chain and token Hashi works with, as the endless row. */
function Brands() {
  return <LogoCloud brands={BRANDS} />
}

/** Hashi's CashTokens address as a card with its QR code, for a docs page. */
function CashTokens() {
  return <CashTokensCard framed />
}

/** The wallets people already have, on both sides. */
function Wallets() {
  return <LogoCloud brands={WALLETS} seconds={30} />
}

/** A lucide icon by name, so .mdx files can write `icon={<Icon name="Route" />}` without imports. */
function Icon({ name, ...props }: { name: keyof typeof icons } & ComponentProps<"svg">) {
  const Glyph = icons[name]
  // A name lucide doesn't have renders nothing rather than breaking the page.
  return Glyph ? <Glyph {...props} /> : null
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    img: (props: ComponentProps<"img">) => <ImageZoom {...(props as ComponentProps<typeof ImageZoom>)} />,
    Accordion,
    Accordions,
    Files,
    Folder,
    File,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    IntoFigure,
    OutFigure,
    OnFigure,
    SystemFigure,
    Brands,
    Wallets,
    CashTokens,
    Logo,
    LogoCloud,
    HashiMark,
    Phone,
    Phones,
    Shot,
    Sheet,
    Quote,
    RouteCard,
    Icon,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
