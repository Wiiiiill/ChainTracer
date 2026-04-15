export type WatchedAddress = {
  address: string
  label?: string
}

export type DirectionFilter = 'ALL' | 'IN' | 'OUT' | 'INTERNAL'

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
