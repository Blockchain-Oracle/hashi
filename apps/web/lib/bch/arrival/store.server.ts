import 'server-only'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { serverEnv } from '@/lib/env.server'
import type { ArrivalTerms } from './contract'
import { arrivalTermsSchema } from './policy'

/**
 * The swap contracts' public terms, one small JSON file per contract address, on the server's persistent volume
 * (ARRIVAL_STORE_DIR). Written atomically (a temporary file, then a rename), so a crash never leaves half a file.
 */

export interface StoredArrival {
  address: string
  terms: ArrivalTerms
  createdAt: number
}

const dir = () => serverEnv.ARRIVAL_STORE_DIR
/** A cash address as a file name: the part after the prefix is only letters and digits. */
const fileOf = (address: string) => join(dir(), `${address.replace(/^bitcoincash:/, '')}.json`)

export async function saveArrival(entry: StoredArrival): Promise<void> {
  await mkdir(dir(), { recursive: true })
  const path = fileOf(entry.address)
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify(entry))
  await rename(temporary, path)
}

const entryNames = async () =>
  (await readdir(dir()).catch(() => [] as string[])).filter((n) => n.endsWith('.json'))

/** Every stored contract, oldest refund time first; a file that does not read as one is skipped. */
export async function listArrivals(): Promise<StoredArrival[]> {
  const entries = await Promise.all(
    (await entryNames()).map(async (name) => {
      try {
        const raw = JSON.parse(await readFile(join(dir(), name), 'utf8')) as Partial<StoredArrival>
        const terms = arrivalTermsSchema.safeParse(raw.terms)
        if (!terms.success || typeof raw.address !== 'string') return undefined
        return { address: raw.address, terms: terms.data, createdAt: Number(raw.createdAt) || 0 }
      } catch {
        return undefined
      }
    }),
  )
  return entries
    .filter((entry): entry is StoredArrival => entry !== undefined)
    .sort((a, b) => a.terms.refundAfter - b.terms.refundAfter)
}

export async function countArrivals(): Promise<number> {
  return (await entryNames()).length
}

/** The keeper's last run, written by every sweep (a file in the store, so it also proves the store is writable). */
const heartbeatFile = () => join(dir(), '.keeper-heartbeat')

export async function writeHeartbeat(now = Date.now()): Promise<void> {
  await mkdir(dir(), { recursive: true })
  await writeFile(heartbeatFile(), String(now))
}

export async function lastHeartbeat(): Promise<number | undefined> {
  const raw = await readFile(heartbeatFile(), 'utf8').catch(() => undefined)
  const at = Number(raw)
  return Number.isFinite(at) && at > 0 ? at : undefined
}

/**
 * Whether the store lives on its own mounted volume (Linux): writes on the container's own layer would vanish on the
 * next deploy, taking every contract's terms with them. Elsewhere (a developer's machine) there is nothing to check.
 */
export async function storeOnVolume(): Promise<boolean> {
  if (process.platform !== 'linux') return true
  const info = await readFile('/proc/self/mountinfo', 'utf8').catch(() => '')
  const store = resolve(dir())
  // Field 5 of each line is the mount point; any mount other than / that holds the store counts.
  return info
    .split('\n')
    .map((line) => line.split(' ')[4])
    .some((point) => point && point !== '/' && (store === point || store.startsWith(`${point}/`)))
}

export async function removeArrival(address: string): Promise<void> {
  await rm(fileOf(address), { force: true })
}
