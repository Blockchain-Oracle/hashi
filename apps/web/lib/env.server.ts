import 'server-only'
import { z } from 'zod'

/**
 * Server-only settings. The relayer key pays gas for gasless USDC deposits; without it the relayer answers
 * "not set up" and the app offers the normal deposit instead. The arrival store and sweep token run the keeper that
 * sends unfinished swap contracts' BCH back to their owners.
 */
const schema = z.object({
  RELAYER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'RELAYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key')
    .optional(),
  /** Optional RPC for Base; viem's default public endpoint is used without it. */
  BASE_RPC_URL: z.url().optional(),
  /** Where swap contracts' public terms are kept (a persistent volume in production). */
  ARRIVAL_STORE_DIR: z.string().min(1),
  /** The keeper's secret for POST /api/arrivals/sweep (Coolify's scheduled task sends it). Without it, no sweep. */
  ARRIVAL_SWEEP_TOKEN: z.string().min(24).optional(),
})

export const serverEnv = schema.parse({
  RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY || undefined,
  BASE_RPC_URL: process.env.BASE_RPC_URL || undefined,
  ARRIVAL_STORE_DIR:
    process.env.ARRIVAL_STORE_DIR ||
    (process.env.NODE_ENV === 'production' ? '/data/arrivals' : '.data/arrivals'),
  ARRIVAL_SWEEP_TOKEN: process.env.ARRIVAL_SWEEP_TOKEN || undefined,
})
