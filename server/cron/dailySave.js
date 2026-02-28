import cron from 'node-cron'
import { fetchLME } from '../services/kme.js'
import { fetchShanghai } from '../services/shanghai.js'
import { fetchGold } from '../services/gold.js'
import { fetchRateTWD } from '../services/rate.js'
import { fetchUSDCNY } from '../services/yahoo.js'
import supabase from '../db/supabase.js'

async function saveDailyPrices() {
  console.log('[cron] Running daily price save...')

  try {
    const [shanghai, rate_twd, lme, usd_cny, gold] = await Promise.allSettled([
      fetchShanghai(),
      fetchRateTWD(),
      fetchLME(),
      fetchUSDCNY(),
      fetchGold(),
    ])

    const unwrap = (r) => (r.status === 'fulfilled' ? r.value : null)

    const shanghaiData = unwrap(shanghai)
    const rateData = unwrap(rate_twd)
    const lmeData = unwrap(lme)
    const usdCnyData = unwrap(usd_cny)
    const goldData = unwrap(gold)

    // Parse LME USD value: '13.215,00' -> 13215.00 (European format)
    const parseLME = (str) => {
      if (!str) return null
      // Remove dots (thousands separator) and replace comma with dot (decimal)
      return parseFloat(str.replace(/\./g, '').replace(',', '.'))
    }

    const today = new Date().toISOString().slice(0, 10)

    const row = {
      date: today,
      shanghai: shanghaiData?.lastprice ? parseFloat(shanghaiData.lastprice) : null,
      rate_twd: rateData ? parseFloat(rateData) : null,
      lme: lmeData?.usd ? parseLME(lmeData.usd) : null,
      usd_cny: usdCnyData?.price ?? null,
      gold: goldData?.bid ?? null,
    }

    const { error } = await supabase
      .from('daily_prices')
      .upsert(row, { onConflict: 'date' })

    if (error) throw new Error(error.message)

    console.log('[cron] Daily prices saved:', row)
  } catch (err) {
    console.error('[cron] Error saving daily prices:', err)
  }
}

// Every day at 18:00 Taiwan time (UTC+8) = 10:00 UTC
cron.schedule('0 10 * * *', saveDailyPrices, {
  timezone: 'UTC',
})

console.log('[cron] Daily save scheduled at 18:00 Taiwan time (10:00 UTC)')
