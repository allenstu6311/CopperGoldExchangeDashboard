import { Router } from 'express'
import { fetchLME } from '../services/kme.js'
import { fetchShanghai } from '../services/shanghai.js'
import { fetchGold } from '../services/gold.js'
import { fetchRateTWD } from '../services/rate.js'
import { fetchUSDCNY } from '../services/yahoo.js'
import supabase from '../db/supabase.js'

const router = Router()

// GET /api/market/latest — fetch all live data sources simultaneously
router.get('/latest', async (req, res) => {
  try {
    const [shanghai, rate_twd, lme, usd_cny, gold] = await Promise.allSettled([
      fetchShanghai(),
      fetchRateTWD(),
      fetchLME(),
      fetchUSDCNY(),
      fetchGold(),
    ])

    const unwrap = (r) => (r.status === 'fulfilled' ? r.value : null)

    res.json({
      shanghai: unwrap(shanghai),
      rate_twd: unwrap(rate_twd),
      lme: unwrap(lme),
      usd_cny: unwrap(usd_cny),
      gold: unwrap(gold),
    })
  } catch (err) {
    console.error('GET /api/market/latest error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/market/history?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/history', async (req, res) => {
  const today = new Date()
  const defaultFrom = new Date(today)
  defaultFrom.setDate(defaultFrom.getDate() - 30)

  const from = req.query.from || defaultFrom.toISOString().slice(0, 10)
  const to = req.query.to || today.toISOString().slice(0, 10)

  try {
    const { data, error } = await supabase
      .from('daily_prices')
      .select('date, shanghai, rate_twd, lme, usd_cny, gold')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })

    if (error) throw new Error(error.message)

    res.json(data)
  } catch (err) {
    console.error('GET /api/market/history error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
