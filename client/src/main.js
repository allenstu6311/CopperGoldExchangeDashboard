import { createApp, h } from 'vue'
import { NConfigProvider, NMessageProvider, darkTheme } from 'naive-ui'
import App from './App.vue'
import './style.css'

// Naive UI 主題設定：深色工業風配色
const themeOverrides = {
  common: {
    primaryColor:         '#e8a838',
    primaryColorHover:    '#f0bc56',
    primaryColorPressed:  '#d49628',
    bodyColor:            '#0a0e14',
  },
}

createApp({
  render: () =>
    h(NConfigProvider, { theme: darkTheme, themeOverrides }, {
      default: () => h(NMessageProvider, null, { default: () => h(App) }),
    }),
}).mount('#app')
