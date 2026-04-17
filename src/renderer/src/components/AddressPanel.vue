<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WatchedAddress } from '../types'

const props = defineProps<{
  addresses: WatchedAddress[]
  balances: Record<string, { balance: string; decimals: number } | null>
  selectedAddress: string | null
  settings: {
    dataSource: 'tronscan' | 'trongrid'
    trongrid: { apiBase: string; hasApiKey: boolean }
  } | null
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'selectAddress', address: string | null): void
  (e: 'addAddress', input: { address: string; label?: string }): void
  (e: 'removeAddress', address: string): void
  (e: 'updateLabel', input: { address: string; label?: string | null }): void
  (e: 'updateVisibility', input: {
    address: string
    visibility?: { in?: boolean; out?: boolean; internal?: boolean } | null
  }): void
  (
    e: 'updateSettings',
    input: {
      dataSource?: 'tronscan' | 'trongrid'
      trongrid?: { apiBase?: string; apiKey?: string | null }
    }
  ): void
}>()

const newAddress = ref('')
const newLabel = ref('')

const showAddModal = ref(false)
const showSettingsModal = ref(false)

const settingsDataSource = ref<'tronscan' | 'trongrid'>('tronscan')
const tronGridApiKey = ref('')

const toast = ref<string | null>(null)
let toastTimer: number | null = null

function openAddModal(): void {
  showAddModal.value = true
}

function closeAddModal(): void {
  showAddModal.value = false
  newAddress.value = ''
  newLabel.value = ''
}

function openSettingsModal(): void {
  if (props.settings) {
    settingsDataSource.value = props.settings.dataSource
    tronGridApiKey.value = ''
  }
  showSettingsModal.value = true
}

function closeSettingsModal(): void {
  showSettingsModal.value = false
  tronGridApiKey.value = ''
}

function saveSettings(): void {
  emit('updateSettings', {
    dataSource: settingsDataSource.value,
    trongrid:
      settingsDataSource.value === 'trongrid'
        ? {
            apiKey: tronGridApiKey.value.trim().length ? tronGridApiKey.value.trim() : null
          }
        : undefined
  })

  closeSettingsModal()
}

async function copyText(text: string): Promise<void> {
  await window.api.clipboardCopy(text)
  toast.value = 'Copied'
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = null
    toastTimer = null
  }, 900)
}

const canAdd = computed(() => newAddress.value.trim().length > 0)

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`
}

function fmtAmount(raw: string, decimals: number): string {
  const s = raw || '0'
  const neg = s.startsWith('-')
  const v = neg ? s.slice(1) : s

  if (!/^\d+$/.test(v)) return raw

  const dec = Math.max(0, decimals)
  const padded = v.padStart(dec + 1, '0')
  const intPart = padded.slice(0, padded.length - dec)
  const fracPart = padded.slice(padded.length - dec).replace(/0+$/, '')
  const out = fracPart.length ? `${intPart}.${fracPart}` : intPart
  return neg ? `-${out}` : out
}

function onAdd(): void {
  const address = newAddress.value.trim()
  if (!address) return
  const label = newLabel.value.trim() || undefined
  emit('addAddress', { address, label })
  closeAddModal()
}

function onLabelBlur(address: string, label: string): void {
  const trimmed = label.trim()
  emit('updateLabel', { address, label: trimmed.length ? trimmed : null })
}

function visIn(a: WatchedAddress): boolean {
  return a.visibility?.in ?? true
}

function visOut(a: WatchedAddress): boolean {
  return a.visibility?.out ?? true
}

function visInternal(a: WatchedAddress): boolean {
  return a.visibility?.internal ?? true
}

function onToggleVisibility(a: WatchedAddress, which: 'in' | 'out' | 'internal', next: boolean): void {
  const visibility = {
    in: visIn(a),
    out: visOut(a),
    internal: visInternal(a),
    [which]: next
  }
  emit('updateVisibility', { address: a.address, visibility })
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="title">Watched addresses</div>
      <div class="header-actions">
        <button class="btn primary" @click="openAddModal">Add</button>
        <button class="btn" @click="openSettingsModal">Source</button>
        <button class="btn" @click="emit('refresh')">Refresh</button>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>

    <div v-if="showSettingsModal" class="modal-backdrop" @click.self="closeSettingsModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Data source</div>
          <button class="btn" @click="closeSettingsModal">Close</button>
        </div>

        <div class="modal-body">
          <label class="label">Provider</label>
          <select v-model="settingsDataSource" class="select">
            <option value="tronscan">Tronscan (default)</option>
            <option value="trongrid">TronGrid</option>
          </select>

          <template v-if="settingsDataSource === 'trongrid'">
            <div class="hint">
              API Key is stored locally (Electron userData). It will not be committed to git.
              <span v-if="props.settings?.trongrid.hasApiKey">(Currently set)</span>
              <span v-else>(Not set)</span>
            </div>
            <input
              v-model="tronGridApiKey"
              class="input"
              placeholder="TronGrid API Key"
              autocomplete="off"
            />
          </template>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="closeSettingsModal">Cancel</button>
          <button class="btn primary" @click="saveSettings">Save</button>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-backdrop" @click.self="closeAddModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Add watched address</div>
          <button class="btn" @click="closeAddModal">Close</button>
        </div>

        <div class="modal-body">
          <input
            v-model="newAddress"
            class="input"
            placeholder="TRON address (T...)"
            @keyup.enter="onAdd"
          />
          <input
            v-model="newLabel"
            class="input"
            placeholder="Label (optional)"
            @keyup.enter="onAdd"
          />
        </div>

        <div class="modal-footer">
          <button class="btn" @click="closeAddModal">Cancel</button>
          <button class="btn primary" :disabled="!canAdd" @click="onAdd">Add</button>
        </div>
      </div>
    </div>

    <div class="filter">
      <label class="label">Filter address</label>
      <select
        class="select"
        :value="props.selectedAddress ?? ''"
        @change="emit('selectAddress', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">All</option>
        <option v-for="a in props.addresses" :key="a.address" :value="a.address">
          {{ a.label ? `${a.label} (${shortAddr(a.address)})` : shortAddr(a.address) }}
        </option>
      </select>
    </div>

    <div class="list">
      <div v-if="props.addresses.length === 0" class="empty">Add 2-10 addresses to begin.</div>

      <div v-for="a in props.addresses" :key="a.address" class="row">
        <div class="row-top">
          <div class="addr" :title="a.address">
            <button class="copy" @click="copyText(a.address)">
              {{ shortAddr(a.address) }}
            </button>
          </div>
          <button class="btn danger" @click="emit('removeAddress', a.address)">Remove</button>
        </div>

        <div class="balance">
          <div class="balance-label">USDT balance</div>
          <div class="balance-value mono">
            <template v-if="props.balances[a.address]">
              {{
                fmtAmount(props.balances[a.address]!.balance, props.balances[a.address]!.decimals)
              }}
            </template>
            <template v-else> -- </template>
          </div>
        </div>

        <input
          class="input"
          :defaultValue="a.label"
          placeholder="Label"
          @blur="onLabelBlur(a.address, ($event.target as HTMLInputElement).value)"
        />

        <div class="visibility">
          <label class="vis-item">
            <input
              type="checkbox"
              :checked="visIn(a)"
              @change="
                onToggleVisibility(a, 'in', ($event.target as HTMLInputElement).checked)
              "
            />
            <span>IN</span>
          </label>
          <label class="vis-item">
            <input
              type="checkbox"
              :checked="visOut(a)"
              @change="
                onToggleVisibility(a, 'out', ($event.target as HTMLInputElement).checked)
              "
            />
            <span>OUT</span>
          </label>
          <label class="vis-item">
            <input
              type="checkbox"
              :checked="visInternal(a)"
              @change="
                onToggleVisibility(a, 'internal', ($event.target as HTMLInputElement).checked)
              "
            />
            <span>INTERNAL</span>
          </label>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 320px;
  height: 100vh;
  padding: 14px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ev-c-gray-3);
  background: rgba(0, 0, 0, 0.2);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ev-c-text-1);
}

.add-box {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.filter {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.label {
  font-size: 12px;
  color: var(--ev-c-text-2);
}

.list {
  display: grid;
  gap: 10px;
  overflow: auto;
  padding-right: 4px;
}

.empty {
  font-size: 12px;
  color: var(--ev-c-text-2);
}

.row {
  border: 1px solid var(--ev-c-gray-3);
  border-radius: 10px;
  padding: 10px;
  background: rgba(32, 33, 39, 0.7);
}

.row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.addr {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.balance {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.balance-label {
  font-size: 12px;
  color: var(--ev-c-text-2);
}

.balance-value {
  font-size: 12px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.visibility {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--ev-c-text-2);
}

.vis-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.vis-item input {
  cursor: pointer;
}

.input {
  width: 100%;
  border-radius: 10px;
  padding: 8px 10px;
  border: 1px solid var(--ev-c-gray-2);
  background: rgba(0, 0, 0, 0.25);
  color: var(--ev-c-text-1);
  outline: none;
}

.select {
  width: 100%;
  border-radius: 10px;
  padding: 8px 10px;
  border: 1px solid var(--ev-c-gray-2);
  background: rgba(0, 0, 0, 0.25);
  color: var(--ev-c-text-1);
  outline: none;
}

.btn {
  border-radius: 10px;
  padding: 8px 10px;
  border: 1px solid var(--ev-c-gray-2);
  background: rgba(0, 0, 0, 0.25);
  color: var(--ev-c-text-1);
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  border-color: #2f7bf6;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.modal {
  width: min(520px, calc(100vw - 40px));
  border: 1px solid var(--ev-c-gray-3);
  border-radius: 14px;
  padding: 12px;
  background: rgba(32, 33, 39, 0.98);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.modal-title {
  font-weight: 800;
  font-size: 14px;
}

.modal-body {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.hint {
  font-size: 12px;
  color: var(--ev-c-text-2);
}

.toast {
  position: fixed;
  top: 14px;
  left: 16px;
  z-index: 30;
  border: 1px solid var(--ev-c-gray-2);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  background: rgba(20, 20, 24, 0.9);
}

.copy {
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.copy:hover {
  text-decoration: underline;
}
</style>
