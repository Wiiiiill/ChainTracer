export type Trc20Transfer = {
  txid: string
  timestampMs: number
  from: string
  to: string
  contract: string
  symbol: string
  decimals: number
  amount: string
  eventIndex?: number
}

const DEFAULT_TRONSCAN_API_BASE = 'https://apilist.tronscan.org/api'
const USDT_TRON_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function asRecord(x: unknown): Record<string, unknown> {
  return x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
}

function asString(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined
}

function asNumber(x: unknown): number | undefined {
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined
}

async function fetchJsonWithRetry(url: string): Promise<unknown> {
  // Tronscan will rate-limit (HTTP 429) if we make too many requests.
  const maxRetries = 4
  let lastStatus = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json'
      }
    })

    if (res.ok) return (await res.json()) as unknown

    lastStatus = res.status

    if (res.status !== 429) {
      throw new Error(`Tronscan HTTP ${res.status}`)
    }

    if (attempt === maxRetries) {
      throw new Error(
        'Tronscan rate limited (HTTP 429). Please wait a bit and retry. / 访问过于频繁(429)，稍等再试。'
      )
    }

    const retryAfter = res.headers.get('retry-after')
    const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : NaN

    const base = Number.isFinite(retryAfterMs) ? retryAfterMs : 450 * Math.pow(2, attempt)
    const jitter = Math.floor(Math.random() * 250)
    await sleep(base + jitter)
  }

  throw new Error(`Tronscan HTTP ${lastStatus}`)
}

function pickTransfersArray(payload: unknown): unknown[] {
  const p = asRecord(payload)
  const data = p.data
  if (Array.isArray(data)) return data
  const tokenTransfers1 = p.token_transfers
  if (Array.isArray(tokenTransfers1)) return tokenTransfers1
  const tokenTransfers2 = p.tokenTransfers
  if (Array.isArray(tokenTransfers2)) return tokenTransfers2
  const transfers = p.transfers
  if (Array.isArray(transfers)) return transfers
  return []
}

function normalizeTransfer(raw: unknown): Trc20Transfer | null {
  const r = asRecord(raw)
  const txid =
    asString(r.transaction_id) ||
    asString(r.transactionId) ||
    asString(r.txID) ||
    asString(r.txid) ||
    ''

  if (!txid) return null

  const from =
    asString(r.from_address) ||
    asString(r.fromAddress) ||
    asString(r.from) ||
    asString(r.owner_address) ||
    ''
  const to = asString(r.to_address) || asString(r.toAddress) || asString(r.to) || ''

  const timestampMs =
    asNumber(r.block_ts) ||
    asNumber(r.timestamp) ||
    asNumber(r.time) ||
    (() => {
      const t = asString(r.block_timestamp) || asString(r.timestamp)
      if (!t) return undefined
      const n = Number(t)
      return Number.isFinite(n) ? n : undefined
    })() ||
    0

  // Tronscan TRC20 transfer shape uses tokenInfo.tokenAbbr + tokenInfo.tokenDecimal
  const tokenInfo = asRecord(r.tokenInfo ?? r.token_info ?? r.token)
  const symbol =
    asString(tokenInfo.tokenAbbr) ||
    asString(tokenInfo.symbol) ||
    asString(r.symbol) ||
    asString(r.tokenAbbr) ||
    'USDT'

  const decimals =
    asNumber(tokenInfo.tokenDecimal) ||
    asNumber(tokenInfo.decimals) ||
    (() => {
      const d =
        asString(tokenInfo.tokenDecimal) ||
        asString(tokenInfo.decimals) ||
        asString(r.decimals) ||
        asString(r.tokenDecimal)
      const n = d ? Number(d) : NaN
      return Number.isFinite(n) ? n : 6
    })() ||
    6

  const contract =
    asString(r.contract_address) ||
    asString(r.contractAddress) ||
    asString(tokenInfo.tokenId) ||
    asString(tokenInfo.address) ||
    ''

  const amount =
    asString(r.quant) ||
    asString(r.amount_str) ||
    asString(r.amount) ||
    (() => {
      const a = r.value
      if (typeof a === 'string') return a
      if (typeof a === 'number') return String(a)
      return undefined
    })() ||
    ''

  const eventIndex = asNumber(r.event_index) || asNumber(r.eventIndex)

  return {
    txid,
    timestampMs,
    from,
    to,
    contract,
    symbol,
    decimals,
    amount,
    eventIndex
  }
}

export async function fetchUsdtTrc20Transfers(params: {
  relatedAddress: string
  start: number
  limit: number
  apiBase?: string
}): Promise<Trc20Transfer[]> {
  const apiBase = (params.apiBase || DEFAULT_TRONSCAN_API_BASE).replace(/\/$/, '')

  // Match Tronscan web UI request:
  //   /api/filter/trc20/transfers?limit=...&start=...&sort=-timestamp&count=true&filterTokenValue=0&relatedAddress=...
  const url = new URL(apiBase + '/filter/trc20/transfers')
  url.searchParams.set('relatedAddress', params.relatedAddress)
  url.searchParams.set('start', String(params.start))
  url.searchParams.set('limit', String(params.limit))
  url.searchParams.set('sort', '-timestamp')
  url.searchParams.set('count', 'true')
  url.searchParams.set('filterTokenValue', '0')

  const payload = await fetchJsonWithRetry(url.toString())
  const arr = pickTransfersArray(payload)
  const normalized = arr.map(normalizeTransfer).filter((x): x is Trc20Transfer => !!x)

  // Only keep USDT.
  return normalized.filter((t) => t.contract === '' || t.contract === USDT_TRON_CONTRACT)
}

export type AggregatedTransferRow = {
  key: string
  txid: string
  timestampMs: number
  from: string
  to: string
  amount: string
  symbol: string
  decimals: number
  direction: 'IN' | 'OUT' | 'INTERNAL'
  matchedAddresses: string[]
}

export async function fetchAggregatedUsdtTransfers(params: {
  watchedAddresses: string[]
  start: number
  limit: number
  apiBase?: string
}): Promise<AggregatedTransferRow[]> {
  const watched = new Set(params.watchedAddresses.map((a) => a.trim()).filter(Boolean))
  const out = new Map<string, AggregatedTransferRow>()

  // Sequential requests are safer against rate-limits for 2-10 addresses.
  for (const addr of watched) {
    const transfers = await fetchUsdtTrc20Transfers({
      relatedAddress: addr,
      start: params.start,
      limit: params.limit,
      apiBase: params.apiBase
    })

    for (const t of transfers) {
      const key = `${t.txid}:${t.eventIndex ?? ''}:${t.from}:${t.to}:${t.amount}:${t.timestampMs}`
      const existing = out.get(key)

      const matched = new Set([
        ...(existing?.matchedAddresses ?? []),
        ...(watched.has(t.from) ? [t.from] : []),
        ...(watched.has(t.to) ? [t.to] : [])
      ])

      const fromWatched = watched.has(t.from)
      const toWatched = watched.has(t.to)
      const direction: AggregatedTransferRow['direction'] =
        fromWatched && toWatched ? 'INTERNAL' : toWatched ? 'IN' : 'OUT'

      out.set(key, {
        key,
        txid: t.txid,
        timestampMs: t.timestampMs,
        from: t.from,
        to: t.to,
        amount: t.amount,
        symbol: t.symbol,
        decimals: t.decimals,
        direction,
        matchedAddresses: [...matched]
      })
    }

    // Small gap to reduce rate-limit risk.
    await sleep(260)
  }

  return [...out.values()].sort((a, b) => b.timestampMs - a.timestampMs)
}

export type UsdtBalance = {
  address: string
  balance: string
  decimals: number
}

export async function fetchUsdtBalance(params: {
  address: string
  apiBase?: string
}): Promise<UsdtBalance | null> {
  const apiBase = (params.apiBase || DEFAULT_TRONSCAN_API_BASE).replace(/\/$/, '')

  const url = new URL(apiBase + '/account')
  url.searchParams.set('address', params.address)

  const payload = asRecord(await fetchJsonWithRetry(url.toString()))
  const list: unknown[] = Array.isArray(payload.trc20token_balances)
    ? (payload.trc20token_balances as unknown[])
    : []

  const usdt = list.find((x) => {
    const r = asRecord(x)
    return r.tokenId === USDT_TRON_CONTRACT || r.token_id === USDT_TRON_CONTRACT
  })

  if (!usdt) return null

  const u = asRecord(usdt)

  const balance = asString(u.balance) || (typeof u.balance === 'number' ? String(u.balance) : '0')
  const decimals =
    asNumber(u.tokenDecimal) ||
    (() => {
      const d = u.tokenDecimal
      const n = typeof d === 'string' ? Number(d) : typeof d === 'number' ? d : NaN
      return Number.isFinite(n) ? n : 6
    })() ||
    6

  return { address: params.address, balance, decimals }
}
