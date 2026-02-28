<script setup>
import { ref, onMounted } from 'vue'
import { getHistory } from '../api/index.js'

const rows = ref([])
const loading = ref(false)
const error = ref(null)

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function iso30DaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

const fromDate = ref(iso30DaysAgo())
const toDate = ref(isoToday())

async function fetchHistory() {
  loading.value = true
  error.value = null
  try {
    rows.value = await getHistory(fromDate.value, toDate.value)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchHistory)

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function fmt(val, decimals = 2) {
  if (val == null) return '—'
  return Number(val).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function downloadExcel() {
  const headers = [
    'Date',
    'Shanghai Copper (元/噸)',
    '匯率 TWD/USD (台幣/美元)',
    'LME Copper (USD/噸)',
    'USD:RMB',
    '國際金價 (USD/盎司)',
  ]

  const csvRows = [
    headers,
    ...rows.value.map((r) => [
      formatDate(r.date),
      r.shanghai ?? '',
      r.rate_twd ?? '',
      r.lme ?? '',
      r.usd_cny ?? '',
      r.gold ?? '',
    ]),
  ]

  // Wrap cells containing commas in quotes
  const escape = (v) => {
    const s = String(v)
    return s.includes(',') ? `"${s}"` : s
  }

  const csv = csvRows.map((row) => row.map(escape).join(',')).join('\r\n')
  // UTF-8 BOM — ensures Excel opens Chinese headers correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })

  const filename = `copper_prices_${fromDate.value}_${toDate.value}.csv`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="history-section">
    <div class="section-header-row">
      <div class="section-title">歷史行情</div>
    </div>

    <div class="query-bar">
      <div class="date-field">
        <label class="field-label mono">From</label>
        <input v-model="fromDate" type="date" class="date-input mono" />
      </div>
      <div class="date-field">
        <label class="field-label mono">To</label>
        <input v-model="toDate" type="date" class="date-input mono" />
      </div>
      <button class="query-btn mono" @click="fetchHistory" :disabled="loading">
        {{ loading ? '查詢中...' : '查詢' }}
      </button>
      <button
        v-if="rows.length > 0"
        class="download-btn mono"
        @click="downloadExcel"
      >
        ↓ Excel
      </button>
    </div>

    <div v-if="error" class="state-msg error">錯誤：{{ error }}</div>
    <div v-else-if="!loading && rows.length === 0" class="state-msg">無資料</div>

    <div class="table-wrap" v-if="rows.length > 0">
      <table class="history-table">
        <thead>
          <tr>
            <th class="mono">Date</th>
            <th class="mono">Shanghai Copper<br /><span class="unit">元/噸</span></th>
            <th class="mono">匯率 TWD/USD<br /><span class="unit">台幣/美元</span></th>
            <th class="mono">LME Copper<br /><span class="unit">USD/噸</span></th>
            <th class="mono">USD:RMB</th>
            <th class="mono">國際金價<br /><span class="unit">USD/盎司</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="row.date"
            :class="{ latest: i === 0 }"
          >
            <td class="mono date-cell">
              {{ formatDate(row.date) }}
              <span v-if="i === 0" class="latest-badge mono">LATEST</span>
            </td>
            <td class="mono">{{ fmt(row.shanghai, 0) }}</td>
            <td class="mono">{{ fmt(row.rate_twd, 4) }}</td>
            <td class="mono">{{ fmt(row.lme, 2) }}</td>
            <td class="mono">{{ fmt(row.usd_cny, 4) }}</td>
            <td class="mono">{{ fmt(row.gold, 2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.history-section {
  margin-top: 8px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Mock toggle */
.mock-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  user-select: none;
  transition: color 0.2s;
}

.mock-toggle input {
  display: none;
}

.toggle-track {
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: var(--border);
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: transform 0.2s, background 0.2s;
}

.mock-toggle.active .toggle-track {
  background: rgba(232, 168, 56, 0.25);
}

.mock-toggle.active .toggle-thumb {
  transform: translateX(14px);
  background: var(--accent);
}

.mock-toggle.active {
  color: var(--accent);
}

.mock-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  background: rgba(232, 168, 56, 0.15);
  border: 1px solid rgba(232, 168, 56, 0.35);
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.06em;
}

.query-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
}

.date-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.2s;
  color-scheme: dark;
}

.date-input:focus {
  border-color: var(--accent);
}

.query-btn {
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: #0a0e14;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 20px;
  transition: opacity 0.2s;
  letter-spacing: 0.04em;
}

.query-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.query-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.download-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  transition: border-color 0.2s, color 0.2s;
  letter-spacing: 0.04em;
}

.download-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.state-msg {
  color: var(--text-secondary);
  padding: 24px 0;
}

.state-msg.error {
  color: var(--red);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.history-table th {
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  text-align: right;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.history-table th:first-child {
  text-align: left;
}

.history-table td {
  padding: 11px 16px;
  text-align: right;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  white-space: nowrap;
}

.history-table td:first-child {
  text-align: left;
}

.history-table tbody tr:last-child td {
  border-bottom: none;
}

.history-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.history-table tbody tr.latest td {
  background: var(--accent-dim);
}

.date-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.latest-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  background: rgba(232, 168, 56, 0.15);
  border: 1px solid rgba(232, 168, 56, 0.3);
  border-radius: 4px;
  padding: 1px 6px;
  letter-spacing: 0.06em;
}

.unit {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 400;
}

.mono {
  font-family: 'IBM Plex Mono', monospace;
}
</style>
