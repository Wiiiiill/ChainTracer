export type AddressVisibility = {
  in?: boolean
  out?: boolean
  internal?: boolean
}

export type DirectionFilter = 'ALL' | 'IN' | 'OUT' | 'INTERNAL'

export type WatchedAddress = {
  address: string
  label?: string
  visibility?: AddressVisibility
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
