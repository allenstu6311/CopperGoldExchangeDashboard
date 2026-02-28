<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import { getLatest, compareWithDB } from '../api/index.js'

const data = ref(null)
const loading = ref(true)
const error = ref(null)
const lastUpdated = ref(null)
const countdown = ref(0)
const refreshing = ref(false)

const message = useMessage()
const REFRESH_MS = 3 * 60 * 1000

let timer = null
let countdownTimer = null

async function load() {
  try {
    error.value = null
    data.value = await getLatest()
    lastUpdated.value = new Date()
    message.success('行情已更新')
    // 背景同步：比較即時值與資料庫，保留當日最高點；失敗不影響 UI
    compareWithDB().catch(() => {})
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function startTimers() {
  clearInterval(timer)
  clearInterval(countdownTimer)

  countdown.value = REFRESH_MS / 1000

  timer = setInterval(() => {
    load()
    countdown.value = REFRESH_MS / 1000
  }, REFRESH_MS)

  countdownTimer = setInterval(() => {
    if (countdown.value > 0) countdown.value--
  }, 1000)
}

async function refresh() {
  refreshing.value = true
  await load()
  refreshing.value = false
  startTimers()
  if (error.value) {
    message.error('更新失敗')
  }
}

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

onMounted(() => {
  load()
  startTimers()
})

onUnmounted(() => {
  clearInterval(timer)
  clearInterval(countdownTimer)
})

// Parse LME price string (European format: '13.215,00') to number
function parseLMEPrice(str) {
  if (!str) return null
  return parseFloat(str.replace(/\./g, '').replace(',', '.'))
}

function formatNumber(n, decimals = 2) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatTime(d) {
  if (!d) return ''
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

function openCardUrl(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

const cards = [
  {
    key: 'shanghai',
    label: 'Shanghai Copper',
    labelZh: '上海銅期貨',
    unit: '元/噸',
    highlight: true,
    url: 'https://www.shfe.com.cn/reports/marketdata/delayedquotes/',
    getValue: (d) => (d.shanghai?.lastprice ? parseFloat(d.shanghai.lastprice) : null),
    getDecimals: () => 0,
    getSub: (d) => d.shanghai?.contractname ?? '',
    // updownrate from SHFE is already a percentage string like '0.45' or '-1.23'
    getChange: (d) => {
      const r = d.shanghai?.updownrate
      if (r == null) return null
      return parseFloat(String(r).replace('%', ''))
    },
  },
  {
    key: 'rate_twd',
    label: 'TWD/USD',
    labelZh: '台銀匯率',
    unit: '台幣/美元',
    highlight: false,
    url: 'https://rate.bot.com.tw/xrt?Lang=zh-TW',
    getValue: (d) => (d.rate_twd ? parseFloat(d.rate_twd) : null),
    getDecimals: () => 4,
    getSub: () => '即期買入',
    getChange: (d) => d.rate_twd_change ?? null, // 由後端與 Supabase 前一筆歷史記錄計算
  },
  {
    key: 'lme',
    label: 'LME Copper',
    labelZh: 'LME 銅',
    unit: 'USD/噸',
    highlight: false,
    url: 'https://www.kme.com/en/services/metal-prices/historical/historical-copper-values',
    getValue: (d) => (d.lme?.usd ? parseLMEPrice(d.lme.usd) : null),
    getDecimals: () => 2,
    getSub: (d) => d.lme?.date ?? '',
    getChange: (d) => d.lme?.changePercent ?? null,
  },
  {
    key: 'usd_cny',
    label: 'USD/CNY',
    labelZh: '美元/人民幣',
    unit: '美元/人民幣',
    highlight: false,
    url: 'https://finance.yahoo.com/quote/CNY%3DX/',
    getValue: (d) => d.usd_cny?.price ?? null,
    getDecimals: () => 4,
    getSub: () => 'Yahoo Finance',
    // Yahoo regularMarketChangePercent is already in % (e.g. 0.15 = 0.15%)
    getChange: (d) => d.usd_cny?.changePercent ?? null,
  },
  {
    key: 'gold',
    label: 'Gold',
    labelZh: '國際金價',
    unit: 'USD/盎司',
    highlight: false,
    url: 'https://www.kitco.com/',
    getValue: (d) => d.gold?.bid,
    getDecimals: () => 2,
    getSub: () => 'Kitco',
    getChange: (d) => d.gold?.changePercentage ?? null,
  },
]
</script>

<template>
  <div class="ticker-section">
    <div class="section-header">
      <div class="live-indicator">
        <span class="live-dot"></span>
        <span class="live-label mono">LIVE</span>
      </div>
      <span v-if="lastUpdated" class="updated-time text-muted mono">
        Updated {{ formatTime(lastUpdated) }}
      </span>
      <span class="countdown text-muted mono">下次更新 {{ formatCountdown(countdown) }}</span>
      <n-button
        size="small"
        tertiary
        :loading="refreshing"
        :disabled="refreshing"
        @click="refresh"
        style="font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.05em;"
      >↻ 即刻刷新</n-button>
    </div>

    <div v-if="loading" class="state-msg">載入中...</div>
    <div v-else-if="error" class="state-msg error">錯誤：{{ error }}</div>

    <div v-else-if="data" class="ticker-grid">
      <div
        v-for="card in cards"
        :key="card.key"
        class="ticker-card"
        :class="{ highlight: card.highlight, clickable: !!card.url }"
        @click="openCardUrl(card.url)"
      >
        <div class="card-header">
          <span class="card-label-zh">{{ card.labelZh }}</span>
          <span class="card-label mono">{{ card.label }}</span>
        </div>

        <div class="card-value mono">
          {{ formatNumber(card.getValue(data), card.getDecimals(data)) }}
        </div>

        <div class="card-footer">
          <span class="card-unit text-muted mono">{{ card.unit }}</span>
          <span
            v-if="card.getChange(data) != null"
            class="change-badge mono"
            :class="card.getChange(data) >= 0 ? 'green' : 'red'"
          >
            {{ card.getChange(data) >= 0 ? '+' : ''
            }}{{ card.getChange(data).toFixed(2) }}%
          </span>
        </div>

        <div v-if="card.getSub(data)" class="card-sub text-muted mono">
          {{ card.getSub(data) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticker-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.live-label {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--green);
  letter-spacing: 0.1em;
}

.updated-time {
  font-size: var(--fs-sm);
}

.countdown {
  font-size: var(--fs-sm);
  margin-left: auto;
}


.state-msg {
  color: var(--text-secondary);
  padding: 24px 0;
}

.state-msg.error {
  color: var(--red);
}

.ticker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.ticker-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s;
}

.ticker-card:hover {
  border-color: #2e3f56;
}

.ticker-card.clickable {
  cursor: pointer;
}

.ticker-card.clickable:hover {
  border-color: var(--accent);
}

.ticker-card.highlight {
  border-left: 3px solid var(--accent);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-label-zh {
  font-size: var(--fs-base);
  color: var(--text-secondary);
  font-weight: 500;
}

.card-label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.card-value {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.card-unit {
  font-size: var(--fs-xs);
  letter-spacing: 0.04em;
}

.change-badge {
  font-size: var(--fs-xs);
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
}

.change-badge.green {
  color: var(--green);
  background: rgba(61, 214, 140, 0.12);
}

.change-badge.red {
  color: var(--red);
  background: rgba(242, 92, 92, 0.12);
}

.card-sub {
  font-size: var(--fs-xs);
  margin-top: -4px;
}

.mono {
  font-family: 'IBM Plex Mono', monospace;
}

.text-muted {
  color: var(--text-muted);
}
</style>
