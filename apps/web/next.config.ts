import path from 'node:path'
import type { NextConfig } from 'next'

const dev = process.env.NODE_ENV !== 'production'

/**
 * Content security policy. Scripts run only from this site (Next's inline bootstrap needs `unsafe-inline`; the dev
 * server needs `eval`). The browser talks straight to the bridge providers (NEAR Intents, THORChain, Cauldron's
 * router and Electrum servers), wallet relays and chain RPCs, so `connect-src` allows https and wss. WalletConnect's
 * Verify API runs in a hidden frame so a phone wallet can confirm this site is who it says it is.
 */
const csp = [
  "default-src 'self'",
  // `wasm-unsafe-eval` lets libauth compile its WebAssembly (secp256k1, hashing) without allowing JS `eval`.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  // /demo plays the demo videos in YouTube's no-cookie player.
  "frame-src 'self' https://verify.walletconnect.org https://verify.walletconnect.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const config: NextConfig = {
  // A self-contained server for the Docker image (apps/web/Dockerfile): only the files the server needs, traced from
  // the workspace root so pnpm's linked packages come along.
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  typedRoutes: true,
  // Keep `next dev` from writing agent instruction files into the repo.
  agentRules: false,
  experimental: { agentUpgrade: false },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Production is HTTPS only (Coolify's proxy holds the certificate); tell browsers to keep it that way.
          ...(dev
            ? []
            : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
        ],
      },
    ]
  },
}

export default config
