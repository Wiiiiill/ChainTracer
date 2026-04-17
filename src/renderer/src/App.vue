<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AddressPanel from './components/AddressPanel.vue'
import TransfersTable from './components/TransfersTable.vue'
import type { AggregatedTransferRow, DirectionFilter, WatchedAddress } from './types'

const addresses = ref<WatchedAddress[]>([])
const rows = ref<AggregatedTransferRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const selectedAddress = ref<string | null>(null)
const direction = ref<DirectionFilter>('ALL')

const balances = ref<Record<string, { balance: string; decimals: number } | null>>({})

const settings = ref<Awaited<ReturnType<typeof window.api.settingsGet>> | null>(null)

const pageStart = ref(0)
const pageLimit = 20

async function loadAddresses(): Promise<void> {
  addresses.value = await window.api.addressesList()
}

async function loadSettings(): Promise<void> {
  settings.value = await window.api.settingsGet()
}

async function refreshBalances(): Promise<void> {
  try {
    balances.value = await window.api.balancesUsdt()
  } catch (e) {
    // Non-fatal
    console.warn(e)
  }
}

async function refreshTransfers(reset = true): Promise<void> {
  if (loading.value) return

  loading.value = true
  error.value = null

  try {
    if (reset) {
      pageStart.value = 0
      rows.value = []
    }

    const next = await window.api.transfersFetchUsdt({
      start: pageStart.value,
      limit: pageLimit
    })

    if (reset) {
      rows.value = next
    } else {
      rows.value = [...rows.value, ...next]
    }

    pageStart.value += pageLimit
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function refreshAll(): Promise<void> {
  // Avoid parallel requests (easy to hit HTTP 429).
  await refreshTransfers(true)
  await refreshBalances()
  await loadSettings()
}

async function addAddress(input: { address: string; label?: string }): Promise<void> {
  try {
    addresses.value = await window.api.addressesAdd(input)
    await refreshAll()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function removeAddress(address: string): Promise<void> {
  try {
    addresses.value = await window.api.addressesRemove({ address })
    if (selectedAddress.value === address) selectedAddress.value = null
    await refreshAll()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function updateLabel(input: { address: string; label?: string | null }): Promise<void> {
  try {
    addresses.value = await window.api.addressesUpdateLabel(input)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function updateVisibility(input: {
  address: string
  visibility?: { in?: boolean; out?: boolean; internal?: boolean } | null
}): Promise<void> {
  try {
    addresses.value = await window.api.addressesUpdateVisibility(input)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function updateSettings(
  input: Parameters<typeof window.api.settingsUpdate>[0]
): Promise<void> {
  try {
    await window.api.settingsUpdate(input)
    await refreshAll()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function openTx(txid: string): void {
  // Use Tronscan tx page; renderer will open externally via main process handler.
  window.open(`https://tronscan.org/#/transaction/${txid}`)
}

onMounted(async () => {
  await loadAddresses()
  if (addresses.value.length) {
    await refreshAll()
  }
})
</script>

<template>
  <div class="app">
    <AddressPanel
      :addresses="addresses"
      :balances="balances"
      :selected-address="selectedAddress"
      :settings="settings"
      @refresh="refreshAll"
      @select-address="(a) => (selectedAddress = a)"
      @add-address="addAddress"
      @remove-address="removeAddress"
      @update-label="updateLabel"
      @update-visibility="updateVisibility"
      @update-settings="updateSettings"
    />

    <TransfersTable
      :addresses="addresses"
      :selected-address="selectedAddress"
      :direction="direction"
      :rows="rows"
      :loading="loading"
      :error="error"
      @update:direction="(v) => (direction = v)"
      @load-more="refreshTransfers(false)"
      @open-tx="openTx"
    />
  </div>
</template>

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
}
</style>
