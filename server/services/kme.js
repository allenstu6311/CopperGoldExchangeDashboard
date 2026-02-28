import * as cheerio from 'cheerio'

/**
 * Fetch LME Copper closing price from kme.com
 * Returns: { date: '26.02.2026', usd: '13.215,00' }
 */
export async function fetchLME() {
  const today = new Date()
  const past = new Date(today)
  past.setDate(past.getDate() - 7)

  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}.${mm}.${yyyy}`
  }

  const params = new URLSearchParams({
    met: 'CU',
    datada: fmt(past),
    dataa: fmt(today),
  })

  const url = `https://www.kme.com/en/services/metal-prices/historical/historical-copper-values/?${params}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  })

  if (!res.ok) throw new Error(`KME fetch failed: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  const rows = []
  $('table tbody tr').each((_, tr) => {
    const tds = $(tr).find('td')
    if (tds.length >= 2) {
      const date = $(tds[0]).text().trim()
      const usd = $(tds[1]).text().trim()
      if (date && usd) rows.push({ date, usd })
    }
  })

  if (!rows.length) throw new Error('KME: no rows found in table')

  const parseUSD = (str) =>
    str ? parseFloat(str.replace(/\./g, '').replace(',', '.')) : null

  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2] ?? null

  let change = null
  let changePercent = null
  if (prev) {
    const lastVal = parseUSD(last.usd)
    const prevVal = parseUSD(prev.usd)
    if (lastVal != null && prevVal != null && prevVal !== 0) {
      change = lastVal - prevVal
      changePercent = ((lastVal - prevVal) / prevVal) * 100
    }
  }

  return { date: last.date, usd: last.usd, change, changePercent }
}
