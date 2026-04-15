export type WatchedAddress = {
  address: string
  label?: string
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

export type UsdtBalance = {
  balance: string
  decimals: number
}

export type WindowApi = {
  addressesList: () => Promise<WatchedAddress[]>
  addressesAdd: (input: { address: string; label?: string }) => Promise<WatchedAddress[]>
  addressesRemove: (input: { address: string }) => Promise<WatchedAddress[]>
  addressesUpdateLabel: (input: {
    address: string
    label?: string | null
  }) => Promise<WatchedAddress[]>
  transfersFetchUsdt: (input: {
    start?: number
    limit?: number
    apiBase?: string
  }) => Promise<AggregatedTransferRow[]>
  balancesUsdt: () => Promise<Record<string, UsdtBalance | null>>
  clipboardCopy: (text: string) => Promise<boolean>
}
