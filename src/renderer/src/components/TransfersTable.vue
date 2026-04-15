<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AggregatedTransferRow, DirectionFilter, WatchedAddress } from '../types'

const props = defineProps<{
  addresses: WatchedAddress[]
  selectedAddress: string | null
  direction: DirectionFilter
  rows: AggregatedTransferRow[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'update:direction', v: DirectionFilter): void
  (e: 'loadMore'): void
  (e: 'openTx', txid: string): void
}>()

const toast = ref<string | null>(null)
let toastTimer: number | null = null

async function copyText(text: string): Promise<void> {
  await window.api.clipboardCopy(text)
  toast.value = 'Copied'
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = null
    toastTimer = null
  }, 900)
}

const addressLabelMap = computed(() => {
  const m = new Map<string, string>()
  for (const a of props.addresses) {
    m.set(a.address, a.label || a.address)
  }
  return m
})

const filteredRows = computed(() => {
  let r = props.rows

  if (props.selectedAddress) {
    r = r.filter((x) => x.matchedAddresses.includes(props.selectedAddress!))
  }

  if (props.direction !== 'ALL') {
    r = r.filter((x) => x.direction === props.direction)
  }

  return r
})

function fmtTime(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

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
</script>

<template>
  <main class="main">
    <div class="header">
      <div class="h1">USDT (TRC20) transfers</div>
      <div class="controls">
        <label class="label">Direction</label>
        <select
          class="select"
          :value="props.direction"
          @change="
            emit('update:direction', ($event.target as HTMLSelectElement).value as DirectionFilter)
          "
        >
          <option value="ALL">All</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
          <option value="INTERNAL">INTERNAL</option>
        </select>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>

    <div v-if="props.error" class="error">
      {{ props.error }}
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>From</th>
            <th>To</th>
            <th class="right">Amount</th>
            <th>Dir</th>
            <th>Matched</th>
            <th>Tx</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading && props.rows.length === 0">
            <td colspan="7" class="muted">Loading...</td>
          </tr>
          <tr v-else-if="filteredRows.length === 0">
            <td colspan="7" class="muted">No transfers yet.</td>
          </tr>
          <tr v-for="r in filteredRows" :key="r.key">
            <td class="mono">{{ fmtTime(r.timestampMs) }}</td>
            <td class="mono" :title="r.from">
              <button class="copy" @click="copyText(r.from)">{{ shortAddr(r.from) }}</button>
            </td>
            <td class="mono" :title="r.to">
              <button class="copy" @click="copyText(r.to)">{{ shortAddr(r.to) }}</button>
            </td>
            <td class="right mono">{{ fmtAmount(r.amount, r.decimals) }}</td>
            <td>
              <span :class="['pill', r.direction.toLowerCase()]">{{ r.direction }}</span>
            </td>
            <td class="mono">
              {{ r.matchedAddresses.map((a) => addressLabelMap.get(a) || shortAddr(a)).join(', ') }}
            </td>
            <td>
              <button class="link" @click="emit('openTx', r.txid)">
                {{ r.txid.slice(0, 10) }}...
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <button class="btn" :disabled="props.loading" @click="emit('loadMore')">
        {{ props.loading ? 'Loading...' : 'Load more' }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.main {
  flex: 1;
  height: 100vh;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.h1 {
  font-size: 16px;
  font-weight: 800;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: var(--ev-c-text-2);
}

.select {
  border-radius: 10px;
  padding: 8px 10px;
  border: 1px solid var(--ev-c-gray-2);
  background: rgba(0, 0, 0, 0.25);
  color: var(--ev-c-text-1);
  outline: none;
}

.toast {
  position: fixed;
  top: 14px;
  right: 16px;
  z-index: 10;
  border: 1px solid var(--ev-c-gray-2);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  background: rgba(20, 20, 24, 0.9);
}

.error {
  border: 1px solid #d94c4c;
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(217, 76, 76, 0.12);
}

.table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--ev-c-gray-3);
  border-radius: 12px;
  background: rgba(32, 33, 39, 0.35);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-align: left;
  font-size: 12px;
}

th {
  position: sticky;
  top: 0;
  background: rgba(20, 20, 24, 0.9);
  backdrop-filter: blur(10px);
  z-index: 1;
}

.muted {
  color: var(--ev-c-text-2);
  text-align: center;
}

.right {
  text-align: right;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--ev-c-gray-2);
}

.pill.in {
  border-color: #2f7bf6;
}

.pill.out {
  border-color: #d94c4c;
}

.pill.internal {
  border-color: #42d392;
}

.btn {
  border-radius: 10px;
  padding: 8px 10px;
  border: 1px solid var(--ev-c-gray-2);
  background: rgba(0, 0, 0, 0.25);
  color: var(--ev-c-text-1);
  cursor: pointer;
}

.link {
  padding: 0;
  border: none;
  background: transparent;
  color: #7aa7ff;
  cursor: pointer;
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

.footer {
  display: flex;
  justify-content: center;
}
</style>
