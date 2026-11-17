/** Every rendered diagram and its pixel size (light and dark share one size), read from the PNGs. */
export const DIAGRAMS = {
  "system": { width: 3200, height: 1680 },
  "into-bch": { width: 1568, height: 664 },
  "out-of-bch": { width: 1568, height: 510 },
  "on-bch": { width: 1568, height: 442 },
} as const

export type DiagramName = keyof typeof DIAGRAMS
