import axios from 'axios'
import { ref } from 'vue'

// Global mock switch — toggle this to put the entire app in mock mode
export const mockMode = ref(false)

const api = axios.create({
  baseURL: '/api/market',
})

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_LATEST = {
  shanghai: {
    contractname: 'cu2604',
    lastprice: '103640',
    updatetime: '2026-02-28 10:00:00',
    updownvalue: 220,
    updownrate: 0.213,
  },
  rate_twd: '31.8520',
  lme: {
    date: '27.02.2026',
    usd: '9.680,00',
    change: 45.5,
    changePercent: 0.47,
  },
  usd_cny: {
    price: 7.2415,
    change: 0.0175,
    changePercent: 0.242,
  },
  gold: {
    bid: 2948.5,
    ask: 2949.0,
    change: 12.3,
    changePercentage: 0.42,
  },
}

function generateMockHistory(from, to) {
  const fromDate = new Date(from + 'T00:00:00')
  const toDate = new Date(to + 'T00:00:00')

  let shanghai = 103500
  let rateTwd = 31.85
  let lme = 9680
  let usdCny = 7.24
  let gold = 2950

  const rows = []
  const cursor = new Date(fromDate)
  while (cursor <= toDate) {
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) {
      shanghai = Math.max(90000, shanghai + (Math.random() - 0.48) * 900)
      rateTwd = Math.max(29, Math.min(34, rateTwd + (Math.random() - 0.5) * 0.12))
      lme = Math.max(8000, lme + (Math.random() - 0.48) * 90)
      usdCny = Math.max(6.9, Math.min(7.5, usdCny + (Math.random() - 0.5) * 0.02))
      gold = Math.max(2500, gold + (Math.random() - 0.48) * 35)

      rows.push({
        date: cursor.toISOString().slice(0, 10),
        shanghai: Math.round(shanghai),
        rate_twd: parseFloat(rateTwd.toFixed(4)),
        lme: parseFloat(lme.toFixed(2)),
        usd_cny: parseFloat(usdCny.toFixed(4)),
        gold: parseFloat(gold.toFixed(2)),
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return rows.reverse()
}

// ─── API functions ────────────────────────────────────────────────────────────

export function getLatest() {
  if (mockMode.value) return Promise.resolve(MOCK_LATEST)
  return api.get('/latest').then((r) => r.data)
}

export function getHistory(from, to) {
  if (mockMode.value) return Promise.resolve(generateMockHistory(from, to))
  return api.get('/history', { params: { from, to } }).then((r) => r.data)
}
