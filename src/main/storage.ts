import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

export type WatchedAddressVisibility = {
  in?: boolean
  out?: boolean
  internal?: boolean
}

export type WatchedAddress = {
  address: string
  label?: string
  visibility?: WatchedAddressVisibility
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
      .map((x) => {
        const vIn = typeof x.visibility?.in === 'boolean' ? x.visibility.in : undefined
        const vOut = typeof x.visibility?.out === 'boolean' ? x.visibility.out : undefined
        const vInternal =
          typeof x.visibility?.internal === 'boolean' ? x.visibility.internal : undefined

        const visibility =
          vIn === undefined && vOut === undefined && vInternal === undefined
            ? undefined
            : { in: vIn, out: vOut, internal: vInternal }

        return {
          address: x.address.trim(),
          label: typeof x.label === 'string' ? x.label : undefined,
          visibility
        }
      })
      .filter((x) => x.address.length > 0)
  } catch {
    return []
  }
}

export async function writeWatchedAddresses(addresses: WatchedAddress[]): Promise<void> {
  const payload: StorageShape = { version: 1, addresses }
  await fs.writeFile(storagePath(), JSON.stringify(payload, null, 2), 'utf-8')
}
