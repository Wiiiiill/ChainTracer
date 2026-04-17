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

export type DataSource = 'tronscan' | 'trongrid'

export type PublicSettings = {
  dataSource: DataSource
  trongrid: {
    apiBase: string
    hasApiKey: boolean
  }
}

export type WindowApi = {
  addressesList: () => Promise<WatchedAddress[]>
  addressesAdd: (input: { address: string; label?: string }) => Promise<WatchedAddress[]>
  addressesRemove: (input: { address: string }) => Promise<WatchedAddress[]>
  addressesUpdateLabel: (input: {
    address: string
    label?: string | null
  }) => Promise<WatchedAddress[]>
  addressesUpdateVisibility: (input: {
    address: string
    visibility?: {
      in?: boolean
      out?: boolean
      internal?: boolean
    } | null
  }) => Promise<WatchedAddress[]>
  transfersFetchUsdt: (input: {
    start?: number
    limit?: number
    apiBase?: string
  }) => Promise<AggregatedTransferRow[]>
  balancesUsdt: () => Promise<Record<string, UsdtBalance | null>>
  settingsGet: () => Promise<PublicSettings>
  settingsUpdate: (input: {
    dataSource?: DataSource
    trongrid?: { apiBase?: string; apiKey?: string | null }
  }) => Promise<PublicSettings>
  clipboardCopy: (text: string) => Promise<boolean>
}
