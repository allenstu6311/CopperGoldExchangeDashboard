'use strict'

const { app, BrowserWindow, Menu, dialog } = require('electron')
const path = require('path')
const http = require('http')
const { pathToFileURL } = require('url')

let win = null

// Poll localhost:port until the server responds (or timeout)
function waitForServer(port, timeout = 15000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeout) {
        return reject(new Error('Server failed to start within 15 seconds'))
      }
      http.get(`http://localhost:${port}`, () => resolve())
        .on('error', () => setTimeout(check, 300))
    }
    check()
  })
}

async function startServer() {
  // Load .env —— packaged: resources/.env, dev: project root .env
  const dotenv = require('dotenv')
  const envPath = app.isPackaged
    ? path.join(process.resourcesPath, '.env')
    : path.join(__dirname, '..', '.env')
  dotenv.config({ path: envPath })

  // Tell the Express server where client/dist is
  // Packaged: extraResources lands in resources/client/dist
  // Dev:      just use the project's client/dist
  process.env.STATIC_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'client', 'dist')
    : path.join(app.getAppPath(), 'client', 'dist')

  // Dynamically import the ESM server (pathToFileURL handles Windows drive letters)
  const serverEntry = path.join(app.getAppPath(), 'server', 'index.js')
  await import(pathToFileURL(serverEntry).href)
}

function createWindow() {
  Menu.setApplicationMenu(null)

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.loadURL('http://localhost:3000')
  win.on('closed', () => { win = null })
}

app.whenReady().then(async () => {
  try {
    await startServer()
    await waitForServer(3000)
    createWindow()
  } catch (err) {
    dialog.showErrorBox('啟動失敗', err.message)
    app.quit()
  }
})

app.on('window-all-closed', () => app.quit())
