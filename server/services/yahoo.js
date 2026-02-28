/**
 * Fetch USD/CNY exchange rate from Yahoo Finance
 * Returns: 6.87
 */
export async function fetchUSDCNY() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/CNY=X'

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  if (!res.ok) throw new Error(`Yahoo Finance fetch failed: ${res.status}`)

  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta
  if (meta?.regularMarketPrice == null) throw new Error('Yahoo: regularMarketPrice not found')

  const price = meta.regularMarketPrice
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null
  const change = prevClose != null ? price - prevClose : null
  const changePercent = (change != null && prevClose !== 0) ? (change / prevClose) * 100 : null

  return { price, change, changePercent }
}
