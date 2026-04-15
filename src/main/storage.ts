import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

export type WatchedAddress = {
  address: string
  label?: string
}

type StorageShape = {
  version: 1
  addresses: WatchedAddress[]
}

function storagePath(): string {
  return join(app.getPath('userData'), 'watched-addresses.json')
}

export async function readWatchedAddresses(): Promise<WatchedAddress[]> {
  try {
    const raw = await fs.readFile(storagePath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<StorageShape>
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.addresses)) return []

    return parsed.addresses
      .filter((x): x is WatchedAddress => !!x && typeof x.address === 'string')
      .map((x) => ({
        address: x.address.trim(),
        label: typeof x.label === 'string' ? x.label : undefined
      }))
      .filter((x) => x.address.length > 0)
  } catch {
    return []
  }
}

export async function writeWatchedAddresses(addresses: WatchedAddress[]): Promise<void> {
  const payload: StorageShape = { version: 1, addresses }
  await fs.writeFile(storagePath(), JSON.stringify(payload, null, 2), 'utf-8')
}
