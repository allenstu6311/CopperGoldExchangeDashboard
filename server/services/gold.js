/**
 * Fetch international gold price from Kitco GraphQL
 * Returns: { bid, ask, change, changePercentage }
 */
export async function fetchGold() {
  const body = {
    operationName: 'MetalQuote',
    query: `query MetalQuote($symbol: String!, $currency: String!) {
      GetMetalQuoteV3(symbol: $symbol, currency: $currency) {
        results {
          bid
          ask
          change
          changePercentage
        }
      }
    }`,
    variables: { symbol: 'AU', currency: 'USD' },
  }

  const res = await fetch('https://kdb-gw.prod.kitco.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.kitco.com',
      Referer: 'https://www.kitco.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Kitco fetch failed: ${res.status}`)

  const data = await res.json()
  const result = data?.data?.GetMetalQuoteV3?.results?.[0]
  if (!result) throw new Error('Kitco: no result data')

  return {
    bid: result.bid,
    ask: result.ask,
    change: result.change,
    changePercentage: result.changePercentage,
  }
}
