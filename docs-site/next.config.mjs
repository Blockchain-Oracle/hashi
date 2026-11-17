import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

/**
 * Hashi's docs: a static export (`out/`), served by one small static container (docs.hashi.cash).
 * `agentRules: false` stops Next writing an AGENTS.md into the project.
 */
/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  agentRules: false,
}

export default withMDX(config)
