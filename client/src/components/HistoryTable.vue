<script setup>
import { h, ref, computed, watch, onMounted } from 'vue'
import { NDataTable, NPagination } from 'naive-ui'
import { getHistory } from '../api/index.js'

const rows = ref([])
const loading = ref(false)
const error = ref(null)

const currentPage = ref(1)
const pageSize = ref(10)

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

// 查詢新資料後重置到第一頁
watch(rows, () => { currentPage.value = 1 })

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

// ─── NDataTable 設定 ──────────────────────────────────────────────────────────

// h() render 函式產生的元素不在 template 內，無法套用 scoped attribute
// 因此使用 inline style 取代 class，避免 scoped 污染問題

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }

const UNIT_STYLE = {
  fontSize: '14px',
  color: 'var(--text-muted)',
  fontWeight: '400',
}

const BADGE_STYLE = {
  fontSize: '10px',
  fontWeight: '600',
  color: 'var(--accent)',
  background: 'rgba(232, 168, 56, 0.15)',
  border: '1px solid rgba(232, 168, 56, 0.3)',
  borderRadius: '4px',
  padding: '1px 6px',
  letterSpacing: '0.06em',
  marginLeft: '10px',
  display: 'inline-block',
  ...MONO,
}

const rowClassName = (_row, index) => {
  return index === 0 && currentPage.value === 1 ? 'latest-row' : ''
}

const columns = [
  {
    title: 'Date',
    key: 'date',
    align: 'left',
    render: (row, index) => {
      const isLatest = index === 0 && currentPage.value === 1
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
        h('span', formatDate(row.date)),
        isLatest ? h('span', { style: BADGE_STYLE }, 'LATEST') : null,
      ])
    },
    sorter: (a, b) => new Date(b.date) - new Date(a.date),
  },
  {
    key: 'shanghai',
    align: 'right',
    title: () => h('span', { style: MONO }, [
      h('div', 'Shanghai Copper'),
      h('span', { style: UNIT_STYLE }, '元/噸'),
    ]),
    render: (row) => h('span', { style: MONO }, fmt(row.shanghai, 0)),
    sorter: (a, b) => (b.shanghai || 0) - (a.shanghai || 0),
  },
  {
    key: 'rate_twd',
    align: 'right',
    title: () => h('span', { style: MONO }, [
      h('div', '匯率 TWD/USD'),
      h('span', { style: UNIT_STYLE }, '台幣/美元'),
    ]),
    render: (row) => h('span', { style: MONO }, fmt(row.rate_twd, 4)),
    sorter: (a, b) => (b.rate_twd || 0) - (a.rate_twd || 0),
  },
  {
    key: 'lme',
    align: 'right',
    title: () => h('span', { style: MONO }, [
      h('div', 'LME Copper'),
      h('span', { style: UNIT_STYLE }, 'USD/噸'),
    ]),
    render: (row) => h('span', { style: MONO }, fmt(row.lme, 2)),
    sorter: (a, b) => (b.lme || 0) - (a.lme || 0),
  },
  {
    key: 'usd_cny',
    align: 'right',
    title: () => h('span', { style: MONO }, [
      h('div', 'USD:RMB'),
      h('span', { style: UNIT_STYLE }, 'USD/人民幣'),
    ]),
    render: (row) => h('span', { style: MONO }, fmt(row.usd_cny, 4)),
    sorter: (a, b) => (b.usd_cny || 0) - (a.usd_cny || 0),
  },
  {
    key: 'gold',
    align: 'right',
    title: () => h('span', { style: MONO }, [
      h('div', '國際金價'),
      h('span', { style: UNIT_STYLE }, 'USD/盎司'),
    ]),
    render: (row) => h('span', { style: MONO }, fmt(row.gold, 2)),
    sorter: (a, b) => (b.gold || 0) - (a.gold || 0),
  },
]
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
      <n-data-table
        :columns="columns"
        :data="paginatedRows"
        :row-class-name="rowClassName"
        :row-key="(row) => row.date"
        :bordered="false"
        :single-line="false"
        :loading="loading"
        size="small"
      />
    </div>
    <div v-if="rows.length > 0" class="pagination-wrap">
      <n-pagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :item-count="rows.length"
        :page-sizes="[10, 20, 50]"
        show-size-picker
      />
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
  overflow: hidden;
}

/* ── NDataTable 樣式覆寫 ─────────────────────────────────────────────────── */

.table-wrap :deep(.n-data-table) {
  background: transparent;
  font-size: 13px;
}

.table-wrap :deep(.n-data-table-base-table) {
  background: transparent;
}

/* Header */
.table-wrap :deep(.n-data-table-th) {
  background: var(--surface) !important;
  color: var(--text-secondary) !important;
  font-size: 16px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border) !important;
  white-space: nowrap;
}

/* Data cells */
.table-wrap :deep(.n-data-table-td) {
  background: transparent !important;
  color: var(--text-primary) !important;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border) !important;
  white-space: nowrap;
}

/* 移除最後一行的底部邊框 */
.table-wrap :deep(.n-data-table-tr:last-child .n-data-table-td) {
  border-bottom: none !important;
}

/* Row hover */
.table-wrap :deep(.n-data-table-tr:hover .n-data-table-td) {
  background: rgba(255, 255, 255, 0.02) !important;
}

/* Latest row highlight */
.table-wrap :deep(.n-data-table-tr.latest-row .n-data-table-td) {
  background: var(--accent-dim) !important;
}

.table-wrap :deep(.n-data-table-th__title){
  margin-right: 10px;
}

/* ── Render 函式內的元件樣式（非 scoped，依賴全域 .mono / .unit） ─────────── */

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
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
  margin-left: 10px;
  display: inline-block;
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
