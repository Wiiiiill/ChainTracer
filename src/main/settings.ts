import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

export type DataSource = 'tronscan' | 'trongrid'

export type AppSettings = {
  dataSource: DataSource
  trongrid?: {
    apiBase?: string
    apiKey?: string
  }
}

export const DEFAULT_TRONSCAN_API_BASE = 'https://apilist.tronscan.org/api'
export const DEFAULT_TRONGRID_API_BASE = 'https://api.trongrid.io'

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function defaultSettings(): AppSettings {
  return {
    dataSource: 'tronscan',
    trongrid: {
      apiBase: DEFAULT_TRONGRID_API_BASE
    }
  }
}

export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>

    const ds = parsed?.dataSource
    const dataSource: DataSource = ds === 'trongrid' ? 'trongrid' : 'tronscan'

    const apiBaseRaw = parsed?.trongrid?.apiBase
    const apiBase =
      typeof apiBaseRaw === 'string' && apiBaseRaw.trim().length ? apiBaseRaw.trim() : undefined

    const apiKeyRaw = parsed?.trongrid?.apiKey
    const apiKey =
      typeof apiKeyRaw === 'string' && apiKeyRaw.trim().length ? apiKeyRaw.trim() : undefined

    return {
      dataSource,
      trongrid: {
        apiBase: apiBase ? apiBase.replace(/\/$/, '') : DEFAULT_TRONGRID_API_BASE,
        apiKey
      }
    }
  } catch {
    return defaultSettings()
  }
}

export async function writeSettings(next: AppSettings): Promise<void> {
  const merged: AppSettings = {
    ...defaultSettings(),
    ...next,
    trongrid: {
      ...defaultSettings().trongrid,
      ...(next.trongrid ?? {})
    }
  }

  await fs.writeFile(settingsPath(), JSON.stringify(merged, null, 2), 'utf-8')
}

export type PublicSettings = {
  dataSource: DataSource
  trongrid: {
    apiBase: string
    hasApiKey: boolean
  }
}

export async function readPublicSettings(): Promise<PublicSettings> {
  const s = await readSettings()
  return {
    dataSource: s.dataSource,
    trongrid: {
      apiBase: s.trongrid?.apiBase || DEFAULT_TRONGRID_API_BASE,
      hasApiKey: !!(s.trongrid?.apiKey && s.trongrid.apiKey.trim().length)
    }
  }
}
