-- Run this in Supabase SQL Editor to create the daily_prices table

CREATE TABLE IF NOT EXISTS daily_prices (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL UNIQUE,
  shanghai    NUMERIC,       -- 上海銅期貨收盤價（元/噸）
  rate_twd    NUMERIC,       -- 台銀匯率 TWD/USD（即期買入）
  lme         NUMERIC,       -- LME Copper 收盤價（USD/噸）
  usd_cny     NUMERIC,       -- USD/CNY 匯率
  gold        NUMERIC,       -- 國際金價（USD/盎司）
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient date range queries
CREATE INDEX IF NOT EXISTS daily_prices_date_idx ON daily_prices (date DESC);

-- Enable Row Level Security (optional, recommended for Supabase)
ALTER TABLE daily_prices ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon key can read)
CREATE POLICY "Allow public read" ON daily_prices
  FOR SELECT USING (true);

-- Allow insert/update via service_role key only (the server uses anon key for upsert,
-- so if you want stricter security, switch the server to use SUPABASE_SERVICE_KEY)
CREATE POLICY "Allow upsert" ON daily_prices
  FOR ALL USING (true);
