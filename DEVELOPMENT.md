# 開發指南 — 銅金匯率儀表板

## 系統需求

- **Node.js** v18 以上
- **npm** v9 以上
- **Supabase** 專案（免費方案即可）

---

## 環境設定

### 1. 複製環境變數範本

```bash
cp .env.example .env
```

編輯 `.env`，填入 Supabase 憑證：

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3000
```

憑證取得位置：Supabase Dashboard → Project Settings → API

### 2. 建立資料庫 Schema

前往 Supabase Dashboard → SQL Editor，執行 `supabase_schema.sql` 的全部內容。

此步驟會建立：
- `daily_prices` 資料表（存放每日收盤快照）
- 日期索引（加速範圍查詢）
- Row Level Security 政策（公開可讀）

---

## 本地開發

需要開啟**兩個終端機**分別啟動前後端：

**終端機 1 — 後端（Port 3000）**
```bash
npm install
npm run dev:server
```

**終端機 2 — 前端（Port 5173）**
```bash
cd client
npm install
cd ..
npm run dev:client
```

前端 Vite dev server 預設將 `/api/*` 請求 proxy 到 `http://localhost:3000`。

開啟瀏覽器：`http://localhost:5173`

### Mock 模式（不需後端）

前端有內建 Mock 資料，適合純 UI 開發。

在 [client/src/api/index.js](client/src/api/index.js) 第 5 行將 `mockMode` 改為 `true`：

```js
export const mockMode = ref(true)   // 改這裡
```

Mock 模式下，即時行情與歷史查詢都會回傳本地假資料（含隨機價格波動），不會發送任何 API 請求。

---

## 生產建置

### 以 Electron 視窗開啟（開發驗證用）

```bash
npm run electron:dev   # 建置前端 + 以 Electron 開啟視窗
```

### 打包成 Windows 可攜式執行檔

```bash
npm run electron:build   # 建置前端 + 打包為 .exe
```

打包完成後，執行檔位於 `dist/` 目錄，輸出為 Windows Portable（單一 `.exe`，無需安裝）。

---

## 目錄結構

```
copper-dashboard/
├── .env.example              # 環境變數範本
├── supabase_schema.sql       # 資料庫 Schema
├── package.json              # 根專案（後端 + 建置指令 + electron-builder 設定）
├── electron/
│   └── main.cjs              # Electron 主程序：啟動 Express、等待伺服器、開視窗
│
├── server/
│   ├── index.js              # Express 主程式，提供 API 與靜態檔案
│   ├── routes/
│   │   └── market.js         # /api/market/latest & /api/market/history
│   ├── services/             # 各資料來源抓取邏輯
│   │   ├── shanghai.js       # 上海銅期貨（SHFE JSON API）
│   │   ├── kme.js            # LME 銅（KME 網頁爬取）
│   │   ├── rate.js           # USD/TWD（台灣銀行網頁爬取）
│   │   ├── gold.js           # 國際金價（Kitco GraphQL）
│   │   └── yahoo.js          # USD/CNY（Yahoo Finance REST）
│   ├── cron/
│   │   └── dailySave.js      # 每日 18:00 台灣時間自動存檔
│   └── db/
│       └── supabase.js       # Supabase 客戶端初始化
│
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.js
        ├── App.vue           # 主版面（Header / Footer）
        ├── style.css         # 全域樣式與 CSS 變數
        ├── api/
        │   └── index.js      # Axios 封裝 + Mock 資料
        └── components/
            ├── TickerGrid.vue    # 即時行情卡片
            └── HistoryTable.vue  # 歷史行情表格 + CSV 匯出
```

---

## API 端點

### `GET /api/market/latest`

同時抓取五個資料來源並回傳，任一來源失敗不影響其他欄位（回傳 `null`）。

**回應範例：**
```json
{
  "shanghai": {
    "contractname": "cu2604",
    "lastprice": "103640",
    "updatetime": "2026-02-28 10:00:00",
    "updownvalue": 220,
    "updownrate": 0.213
  },
  "rate_twd": "31.8520",
  "lme": {
    "date": "27.02.2026",
    "usd": "9.680,00",
    "change": 45.5,
    "changePercent": 0.47
  },
  "usd_cny": {
    "price": 7.2415,
    "change": 0.0175,
    "changePercent": 0.242
  },
  "gold": {
    "bid": 2948.5,
    "ask": 2949.0,
    "change": 12.3,
    "changePercentage": 0.42
  }
}
```

---

### `GET /api/market/history?from=YYYY-MM-DD&to=YYYY-MM-DD`

查詢 Supabase `daily_prices` 資料表。`from` / `to` 省略時預設為最近 30 天。

**回應範例：**
```json
[
  {
    "date": "2026-02-28",
    "shanghai": 103640,
    "rate_twd": 31.852,
    "lme": 9680.0,
    "usd_cny": 7.2415,
    "gold": 2948.5
  }
]
```

---

## 打包成執行檔

本專案使用 **Electron** 封裝成 Windows 可攜式應用程式（Portable `.exe`），不需安裝、雙擊即可執行。

### 打包流程

```bash
npm run electron:build
```

此指令會依序執行：
1. `npm run build` — 將 Vue 前端建置至 `client/dist/`
2. `electron-builder` — 將下列內容打包成單一 `.exe`：
   - `electron/main.cjs`（Electron 主程序）
   - `server/`（Express API 伺服器）
   - `client/dist/`（前端靜態檔，作為 extraResources）
   - `.env`（Supabase 憑證，作為 extraResources）

輸出檔案位於 `dist/` 目錄。

### 執行時行為

啟動後，Electron 主程序會：
1. 讀取 `.env`（打包版位於 `resources/.env`）
2. 動態載入並啟動 Express 伺服器（port 3000）
3. 等待伺服器就緒後，開啟 `http://localhost:3000` 視窗

### 注意事項

- 打包前請確認根目錄有 `.env` 並填入正確的 Supabase 憑證，該檔案會被嵌入執行檔的 resources 中
- 打包設定位於 [package.json](package.json) 的 `"build"` 欄位
