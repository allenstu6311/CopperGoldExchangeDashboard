import * as cheerio from 'cheerio'

/**
 * Fetch TWD/USD spot buy rate from Bank of Taiwan
 * Returns: '31.24'
 */
export async function fetchRateTWD() {
  const url = 'https://rate.bot.com.tw/xrt?Lang=zh-TW'

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  })

  if (!res.ok) throw new Error(`BOT rate fetch failed: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  let spotBuy = null

  $('tbody tr').each((_, tr) => {
    const firstTd = $(tr).find('td').first().text().trim()
    if (firstTd.includes('USD') || firstTd.includes('美元')) {
      const tds = $(tr).find('td')
      // 4th td (index 3) = 即期買入
      spotBuy = $(tds[3]).text().trim()
    }
  })

  if (!spotBuy) throw new Error('BOT: USD rate not found')

  return spotBuy
}
