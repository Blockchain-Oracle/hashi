import { ogImage } from "@/lib/og"
import { SITE } from "@/lib/site"

export const revalidate = false

/** The front page's link preview, drawn at build time. */
export async function GET() {
  return ogImage({ kicker: "Stablecoin bridge to Bitcoin Cash", title: SITE.tagline, description: SITE.description })
}
