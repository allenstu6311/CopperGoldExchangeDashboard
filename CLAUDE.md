# 銅金匯率儀表板 — AI 工作上下文

## 專案一句話

Node.js + Express 後端抓取多個金融資料來源，Vue 3 前端顯示即時銅價、金價與匯率，並以 Supabase 儲存每日快照供歷史查詢。

---

## 架構總覽

```
瀏覽器 (Vue 3 + Vite)
  │
  ├─ GET /api/market/latest   ←─ 每 3 分鐘自動刷新
  └─ GET /api/market/history  ←─ 使用者查詢歷史

Express Server (server/index.js)
  ├─ 靜態服務 client/dist/（生產環境）
  └─ /api/market → server/routes/market.js
        ├─ /latest → Promise.allSettled(5 個 service)
        └─ /history → Supabase query

Services（各自獨立，互不依賴）
  ├─ shanghai.js   SHFE JSON API
  ├─ kme.js        KME 網頁爬取（Cheerio）
  ├─ rate.js       台灣銀行網頁爬取（Cheerio）
  ├─ gold.js       Kitco GraphQL POST
  └─ yahoo.js      Yahoo Finance REST

Cron（server/cron/dailySave.js）
  └─ 每日 10:00 UTC（18:00 台灣時間）→ upsert Supabase daily_prices
```

---

## 關鍵檔案職責

| 檔案 | 職責 |
|------|------|
| `server/index.js` | Express 初始化、掛載路由、serve 靜態檔案、啟動 cron |
| `server/routes/market.js` | 兩個 API 端點的 handler |
| `server/services/*.js` | 各資料來源的抓取與解析邏輯 |
| `server/cron/dailySave.js` | 排程抓取 + upsert Supabase |
| `server/db/supabase.js` | Supabase client 單例初始化 |
| `client/src/api/index.js` | Axios 封裝、Mock 模式開關、假資料產生器 |
| `client/src/components/TickerGrid.vue` | 即時行情卡片、自動刷新、漲跌色 |
| `client/src/components/HistoryTable.vue` | 歷史表格、日期選擇器、CSV 匯出 |
| `client/src/App.vue` | 主版面：Header、Footer、元件組合 |
| `supabase_schema.sql` | 資料庫建表 DDL，需手動在 Supabase SQL Editor 執行 |

---

## 資料庫 Schema

```sql
CREATE TABLE daily_prices (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL UNIQUE,   -- 衝突鍵，upsert 使用
  shanghai   NUMERIC,               -- 元/噸
  rate_twd   NUMERIC,               -- TWD/USD 即期買入
  lme        NUMERIC,               -- USD/噸
  usd_cny    NUMERIC,               -- USD/CNY
  gold       NUMERIC,               -- USD/盎司
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 特殊邏輯（容易踩坑）

### LME 歐式數字格式
KME 回傳的價格格式為歐洲慣用格式，例如 `"9.680,00"`（`.` 為千位分隔符，`,` 為小數點）。
存入資料庫前需轉換：
```js
parseFloat(str.replace(/\./g, '').replace(',', '.'))
// "9.680,00" → 9680.00
```
此邏輯在 `server/cron/dailySave.js` 的 `parseLME()` 函式。前端 `TickerGrid.vue` 顯示時也需處理相同格式。

### CSV 匯出的 UTF-8 BOM
`HistoryTable.vue` 匯出 CSV 時加入 `\uFEFF` BOM，使 Windows Excel 能正確識別中文欄位名稱：
```js
const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
```

### Mock 模式
`client/src/api/index.js` 頂部有全域開關：
```js
export const mockMode = ref(false)  // 改為 true 啟用 Mock
```
Mock 模式下 `getLatest()` 和 `getHistory()` 完全不發 HTTP 請求，直接回傳本地假資料。`generateMockHistory()` 會依日期範圍產生帶有隨機波動的假歷史資料（排除週末）。

### Promise.allSettled 容錯設計
`/api/market/latest` 和 cron 都使用 `Promise.allSettled()` 同時呼叫五個 service，任一失敗不會中斷整體，對應欄位回傳 `null`：
```js
const unwrap = (r) => (r.status === 'fulfilled' ? r.value : null)
```

---

## API 端點速查

```
GET /api/market/latest
  → 同時抓取 5 個來源，回傳 { shanghai, rate_twd, lme, usd_cny, gold }
  → 任一 service 失敗，對應欄位為 null

GET /api/market/history?from=YYYY-MM-DD&to=YYYY-MM-DD
  → 查 Supabase daily_prices
  → 省略參數 → 預設最近 30 天
  → 回傳陣列，按 date DESC 排序
```

---

## 環境變數

```
SUPABASE_URL        Supabase 專案 URL
SUPABASE_ANON_KEY   Supabase anon 公鑰（有 RLS，僅能讀寫 daily_prices）
PORT                伺服器 port，預設 3000
```

---

## Cron 排程細節

- 排程設定：`0 10 * * *`（UTC），等同台灣時間每日 18:00
- 邏輯：抓取五個 service → parseLME 轉換格式 → upsert Supabase（`onConflict: 'date'`，同一天重跑不會產生重複資料）

---

## 開發注意事項

- **本地開發需兩個 terminal**：`npm run dev:server`（port 3000）+ `npm run dev:client`（port 5173），Vite 的 proxy 設定將 `/api/*` 轉發至 3000
- **前端不直接呼叫外部 API**，全部透過自家後端代理，避免 CORS 問題
- **生產環境**由 Express 同時 serve 前端靜態檔（`client/dist/`）與 API，只需一個 process
- **Supabase schema 需手動執行**，不會自動建立，見 `supabase_schema.sql`
- **render.yaml** 已設定好建置與啟動指令，連 GitHub 後可直接部署 Render
