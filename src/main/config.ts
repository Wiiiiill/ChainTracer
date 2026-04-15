import { promises as fs } from 'fs'
import { join } from 'path'

export type TronGridConfig = {
  apiBase: string
  apiKey?: string
}

export type AppConfig = {
  trongrid?: Partial<TronGridConfig>
}

const DEFAULT_CONFIG_PATH = join(process.cwd(), 'chain-tracer.config.json')

export async function readAppConfig(): Promise<{ trongrid: TronGridConfig }> {
  let parsed: AppConfig = {}

  try {
    const raw = await fs.readFile(DEFAULT_CONFIG_PATH, 'utf-8')
    parsed = JSON.parse(raw) as AppConfig
  } catch {
    // optional
  }

  const apiBaseRaw = parsed?.trongrid?.apiBase
  const apiBase = (
    typeof apiBaseRaw === 'string' && apiBaseRaw.trim().length
      ? apiBaseRaw
      : 'https://api.trongrid.io'
  ).replace(/\/$/, '')

  const apiKeyRaw = parsed?.trongrid?.apiKey
  const apiKey =
    typeof apiKeyRaw === 'string' && apiKeyRaw.trim().length ? apiKeyRaw.trim() : undefined

  return {
    trongrid: {
      apiBase,
      apiKey
    }
  }
}
