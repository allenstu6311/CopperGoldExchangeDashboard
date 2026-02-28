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

// POST /api/market/compare — compare live data with today's DB record and upsert higher values
router.post('/compare', async (_req, res) => {
  try {
    // 1. Fetch all live data simultaneously
    const [shanghaiResult, rateTwdResult, lmeResult, usdCnyResult, goldResult] =
      await Promise.allSettled([
        fetchShanghai(),
        fetchRateTWD(),
        fetchLME(),
        fetchUSDCNY(),
        fetchGold(),
      ])

    const unwrap = (r) => (r.status === 'fulfilled' ? r.value : null)
    const shanghaiData = unwrap(shanghaiResult)
    const rateTwdData  = unwrap(rateTwdResult)
    const lmeData      = unwrap(lmeResult)
    const usdCnyData   = unwrap(usdCnyResult)
    const goldData     = unwrap(goldResult)

    // 2. Parse live values into numeric form (same convention as dailySave.js)
    const parseLME = (str) => {
      if (!str) return null
      // LME uses European format: "9.680,00" → 9680.00
      return parseFloat(str.replace(/\./g, '').replace(',', '.'))
    }

    const live = {
      shanghai: shanghaiData?.lastprice ? parseFloat(shanghaiData.lastprice) : null,
      rate_twd: rateTwdData             ? parseFloat(rateTwdData)            : null,
      lme:      lmeData?.usd            ? parseLME(lmeData.usd)              : null,
      usd_cny:  usdCnyData?.price       ?? null,
      gold:     goldData?.bid           ?? null,
    }

    const today = new Date().toISOString().slice(0, 10)
    const SELECT_COLS = 'date, shanghai, rate_twd, lme, usd_cny, gold'

    // 3. Query today's existing record (.maybeSingle returns null data without error when not found)
    const { data: existing, error: fetchError } = await supabase
      .from('daily_prices')
      .select(SELECT_COLS)
      .eq('date', today)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)

    let finalRecord

    if (!existing) {
      // 4a. No record today → insert
      const { data: inserted, error: insertError } = await supabase
        .from('daily_prices')
        .insert({ date: today, ...live })
        .select(SELECT_COLS)
        .single()

      if (insertError) throw new Error(insertError.message)
      finalRecord = inserted
    } else {
      // 4b. Record exists → update only fields where live value is larger
      const updates = {}
      for (const field of ['shanghai', 'rate_twd', 'lme', 'usd_cny', 'gold']) {
        const liveVal = live[field]
        const dbVal   = existing[field]
        if (liveVal !== null && (dbVal === null || liveVal > dbVal)) {
          updates[field] = liveVal
        }
      }

      if (Object.keys(updates).length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from('daily_prices')
          .update(updates)
          .eq('date', today)
          .select(SELECT_COLS)
          .single()

        if (updateError) throw new Error(updateError.message)
        finalRecord = updated
      } else {
        // Nothing to update — return existing record as-is
        finalRecord = existing
      }
    }

    res.json(finalRecord)
  } catch (err) {
    console.error('POST /api/market/compare error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
