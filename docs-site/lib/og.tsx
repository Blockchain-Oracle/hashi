import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { OG, SITE } from "./site"

/*
 * Link previews in Hashi's look: the cream page, ink title in Figtree, the vermilion mark, a mono "/ SECTION"
 * kicker. Drawn once at build; fonts read from disk (assets/fonts) so the Docker build needs no network for them.
 */

const PAPER = "#FFFAF5"
const INK = "#121111"
const MUTED = "rgba(18,17,17,0.6)"
const VERMILION = "#FF2F00"

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file))
const fontsOnce = Promise.all([font("Figtree-Medium.ttf"), font("Figtree-Regular.ttf"), font("GeistMono-Medium.ttf")])

async function fonts() {
  const [medium, regular, mono] = await fontsOnce
  return [
    { name: "Figtree", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Figtree", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 500 as const, style: "normal" as const },
  ]
}

/** The mark: a vermilion tile with the arched bridge over a waterline (as in the app). */
function Mark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: VERMILION,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 24 24" fill="none">
        <path d="M3 15.5C6 8.5 18 8.5 21 15.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8 11.2v4.3M12 9.9v5.6M16 11.2v4.3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M2.5 19.5h19" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/** A preview card: a kicker (the section), the title, a line of description. */
export async function ogImage({ kicker, title, description }: { kicker: string; title: string; description?: string }) {
  // The preview fonts have no ⇄; write it plainly rather than fetch a font at build time.
  description = description?.replace(/ ⇄ /g, " · ")
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: PAPER,
        color: INK,
        fontFamily: "Figtree",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Mark size={56} />
        <div style={{ display: "flex", fontSize: 34, fontWeight: 500, letterSpacing: -1 }}>{SITE.name}</div>
        <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 20, color: MUTED, letterSpacing: 2 }}>
          / DOCS
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 22, color: MUTED, letterSpacing: 2.5 }}>
          {`/ ${kicker.toUpperCase()}`}
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 500, letterSpacing: -3, lineHeight: 1.02 }}>{title}</div>
        {description ? (
          <div style={{ display: "flex", fontSize: 30, color: MUTED, lineHeight: 1.3, maxWidth: 1000 }}>
            {description.length > 150 ? `${description.slice(0, 147)}…` : description}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", height: 6, width: 120, background: VERMILION, borderRadius: 3 }} />
    </div>,
    { ...OG, fonts: await fonts() },
  )
}
