<script setup>
import TickerGrid from './components/TickerGrid.vue'
import HistoryTable from './components/HistoryTable.vue'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="header-left">
        <div class="logo-mark"></div>
        <div>
          <h1 class="app-title">銅金匯率儀表板</h1>
          <p class="app-subtitle mono">Copper Gold Exchange Dashboard</p>
        </div>
      </div>
      <div class="header-right">
        <span class="header-tag mono">LME · SHFE · GOLD · FX</span>
      </div>
    </header>

    <main>
      <TickerGrid />
      <div class="divider"></div>
      <HistoryTable />
    </main>

    <footer class="app-footer">
      <span class="mono">
        資料來源：KME · SHFE · Kitco · Bank of Taiwan · Yahoo Finance
      </span>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 32px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #b8782a 100%);
  flex-shrink: 0;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.app-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  margin-top: 3px;
}

.header-tag {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.1em;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 12px;
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 36px 0;
}

.app-footer {
  margin-top: auto;
  padding-top: 32px;
  border-top: 1px solid var(--border);
  margin-top: 40px;
  font-size: 11px;
  color: var(--text-muted);
}

.mono {
  font-family: 'IBM Plex Mono', monospace;
}
</style>
