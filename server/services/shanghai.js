/**
 * Fetch Shanghai Copper Futures (SHFE) delayed market data
 * Returns: { contractname: 'cu2604', lastprice: '103570', updatetime: '...' }
 */
export async function fetchShanghai() {
  const ts = Date.now()
  const url = `https://www.shfe.com.cn/data/tradedata/future/delaymarket/delaymarket_cu.dat?_=${ts}`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://www.shfe.com.cn/',
    },
  })

  if (!res.ok) throw new Error(`SHFE fetch failed: ${res.status}`)

  const data = await res.json()
  const first = data?.delaymarket?.[0]
  if (!first) throw new Error('SHFE: no delaymarket data')

  const lastprice = parseFloat(first.lastprice ?? first.LASTPRICE)
  const presettlement = parseFloat(first.presettlementprice ?? first.PRESETTLEMENTPRICE)
  const updownvalue = parseFloat(first.upperdown ?? first.UPPERDOWN) || (lastprice - presettlement)
  const updownrate = (!isNaN(presettlement) && presettlement !== 0)
    ? (updownvalue / presettlement) * 100
    : null

  return {
    contractname: first.contractname ?? first.CONTRACTNAME,
    lastprice: String(lastprice),
    updatetime: first.updatetime ?? first.UPDATETIME,
    updownvalue: isNaN(updownvalue) ? null : updownvalue,
    updownrate: updownrate,
  }
}
