export type Trc20Transfer = {
  txid: string
  timestampMs: number
  from: string
  to: string
  contract: string
  symbol: string
  decimals: number
  amount: string
}

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

async function fetchJsonWithRetry(url: string, headers: Record<string, string>): Promise<unknown> {
  const maxRetries = 4
  let lastStatus = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers })

    if (res.ok) return (await res.json()) as unknown

    lastStatus = res.status

    if (res.status !== 429) {
      throw new Error(`TronGrid HTTP ${res.status}`)
    }

    if (attempt === maxRetries) {
      throw new Error(
        'TronGrid rate limited (HTTP 429). Please wait a bit and retry. / 访问过于频繁(429)，稍等再试。'
      )
    }

    const retryAfter = res.headers.get('retry-after')
    const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : NaN

    const base = Number.isFinite(retryAfterMs) ? retryAfterMs : 450 * Math.pow(2, attempt)
    const jitter = Math.floor(Math.random() * 250)
    await sleep(base + jitter)
  }

  throw new Error(`TronGrid HTTP ${lastStatus}`)
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const h: Record<string, string> = { accept: 'application/json' }
  if (apiKey) h['TRON-PRO-API-KEY'] = apiKey
  return h
}

function normalizeTransfer(raw: unknown): Trc20Transfer | null {
  const r = asRecord(raw)
  const txid = asString(r.transaction_id) || asString(r.transactionId) || asString(r.txid) || ''
  if (!txid) return null

  const timestampMs =
    asNumber(r.block_timestamp) || asNumber(r.blockTimestamp) || asNumber(r.timestamp) || 0
  const from = asString(r.from) || asString(r.from_address) || ''
  const to = asString(r.to) || asString(r.to_address) || ''

  const tokenInfo = asRecord(r.token_info ?? r.tokenInfo ?? r.token)
  const contract = asString(tokenInfo.address) || asString(r.contract_address) || ''
  const symbol = asString(tokenInfo.symbol) || asString(r.symbol) || 'USDT'

  const decimals =
    asNumber(tokenInfo.decimals) ||
    (() => {
      const d = asString(tokenInfo.decimals)
      const n = d ? Number(d) : NaN
      return Number.isFinite(n) ? n : 6
    })() ||
    6

  const amount =
    asString(r.value) ||
    asString(r.quant) ||
    asString(r.amount) ||
    (typeof r.value === 'number' ? String(r.value) : '')

  return {
    txid,
    timestampMs,
    from,
    to,
    contract,
    symbol,
    decimals,
    amount
  }
}

export async function fetchUsdtTrc20Transfers(params: {
  relatedAddress: string
  start: number
  limit: number
  apiBase: string
  apiKey?: string
}): Promise<Trc20Transfer[]> {
  const url = new URL(
    params.apiBase.replace(/\/$/, '') + `/v1/accounts/${params.relatedAddress}/transactions/trc20`
  )
  url.searchParams.set('only_confirmed', 'true')
  url.searchParams.set('limit', String(params.limit))
  url.searchParams.set('order_by', 'block_timestamp,desc')

  // TronGrid uses pagination via "fingerprint".
  // We'll treat "start" as "page index" and walk fingerprint N times.
  const pageIndex = Math.max(0, Math.floor(params.start / Math.max(1, params.limit)))

  const headers = buildHeaders(params.apiKey)

  let fingerprint: string | undefined

  for (let i = 0; i < pageIndex; i++) {
    const pageUrl = new URL(url)
    if (fingerprint) pageUrl.searchParams.set('fingerprint', fingerprint)

    const payload = asRecord(await fetchJsonWithRetry(pageUrl.toString(), headers))
    const meta = asRecord(payload.meta)
    const next = asString(meta.fingerprint)
    if (!next) return []
    fingerprint = next

    // small gap to reduce rate-limit risk
    await sleep(80)
  }

  const finalUrl = new URL(url)
  if (fingerprint) finalUrl.searchParams.set('fingerprint', fingerprint)

  const payload = asRecord(await fetchJsonWithRetry(finalUrl.toString(), headers))
  const arr = Array.isArray(payload.data) ? (payload.data as unknown[]) : []
  const normalized = arr.map(normalizeTransfer).filter((x): x is Trc20Transfer => !!x)

  return normalized.filter((t) => t.contract === USDT_TRON_CONTRACT)
}

export type UsdtBalance = {
  address: string
  balance: string
  decimals: number
}

export async function fetchUsdtBalance(params: {
  address: string
  apiBase: string
  apiKey?: string
}): Promise<UsdtBalance | null> {
  const url = new URL(params.apiBase.replace(/\/$/, '') + `/v1/accounts/${params.address}`)
  url.searchParams.set('only_confirmed', 'true')

  const headers = buildHeaders(params.apiKey)
  const payload = asRecord(await fetchJsonWithRetry(url.toString(), headers))
  const data0 = Array.isArray(payload.data) ? asRecord((payload.data as unknown[])[0]) : {}

  // Shape: trc20: [ { <contractAddress>: "balance" }, ... ]
  const trc20 = Array.isArray(data0.trc20) ? (data0.trc20 as unknown[]) : []

  for (const entry of trc20) {
    const e = asRecord(entry)
    const bal = e[USDT_TRON_CONTRACT]
    if (typeof bal === 'string' || typeof bal === 'number') {
      return {
        address: params.address,
        balance: typeof bal === 'string' ? bal : String(bal),
        decimals: 6
      }
    }
  }

  return null
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
  apiBase: string
  apiKey?: string
}): Promise<AggregatedTransferRow[]> {
  const watched = new Set(params.watchedAddresses.map((a) => a.trim()).filter(Boolean))
  const out = new Map<string, AggregatedTransferRow>()

  for (const addr of watched) {
    const transfers = await fetchUsdtTrc20Transfers({
      relatedAddress: addr,
      start: params.start,
      limit: params.limit,
      apiBase: params.apiBase,
      apiKey: params.apiKey
    })

    for (const t of transfers) {
      const key = `${t.txid}:${t.from}:${t.to}:${t.amount}:${t.timestampMs}`
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

    await sleep(220)
  }

  return [...out.values()].sort((a, b) => b.timestampMs - a.timestampMs)
}
