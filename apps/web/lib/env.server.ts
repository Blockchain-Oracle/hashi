import 'server-only'
import { z } from 'zod'

/**
 * Server-only settings. The relayer key pays gas for gasless USDC deposits; without it the relayer answers
 * "not set up" and the app offers the normal deposit instead.
 */
const schema = z.object({
  RELAYER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'RELAYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key')
    .optional(),
  /** Optional RPC for Base; viem's default public endpoint is used without it. */
  BASE_RPC_URL: z.url().optional(),
})

export const serverEnv = schema.parse({
  RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY || undefined,
  BASE_RPC_URL: process.env.BASE_RPC_URL || undefined,
})
