import { app, shell, BrowserWindow, ipcMain, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { readWatchedAddresses, writeWatchedAddresses, type WatchedAddress } from './storage'
import { readAppConfig } from './config'
import { fetchAggregatedUsdtTransfers, fetchUsdtBalance } from './trongrid'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeTronAddress(addr: string): string {
  return addr.trim()
}

function isProbablyTronAddress(addr: string): boolean {
  // Keep validation light; Tronscan will be authoritative.
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)
}

function uniqueByAddress(addresses: WatchedAddress[]): WatchedAddress[] {
  const seen = new Set<string>()
  const out: WatchedAddress[] = []
  for (const a of addresses) {
    const norm = normalizeTronAddress(a.address)
    if (!norm) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push({ address: norm, label: a.label })
  }
  return out
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('clipboard:copy', async (_evt, input: { text: string }) => {
    const text = typeof input?.text === 'string' ? input.text : ''
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('addresses:list', async () => {
    return await readWatchedAddresses()
  })

  ipcMain.handle('addresses:add', async (_evt, input: { address: string; label?: string }) => {
    const address = normalizeTronAddress(input?.address ?? '')
    if (!isProbablyTronAddress(address)) {
      throw new Error('Invalid TRON address')
    }

    const existing = await readWatchedAddresses()
    const next = uniqueByAddress([{ address, label: input?.label }, ...existing])
    await writeWatchedAddresses(next)
    return next
  })

  ipcMain.handle('addresses:remove', async (_evt, input: { address: string }) => {
    const address = normalizeTronAddress(input?.address ?? '')
    const existing = await readWatchedAddresses()
    const next = existing.filter((a) => normalizeTronAddress(a.address) !== address)
    await writeWatchedAddresses(next)
    return next
  })

  ipcMain.handle(
    'addresses:updateLabel',
    async (_evt, input: { address: string; label?: string | null }) => {
      const address = normalizeTronAddress(input?.address ?? '')
      const existing = await readWatchedAddresses()
      const next = existing.map((a) => {
        if (normalizeTronAddress(a.address) !== address) return a
        const label = typeof input?.label === 'string' ? input.label : undefined
        return { ...a, label }
      })
      await writeWatchedAddresses(next)
      return next
    }
  )

  ipcMain.handle('balances:usdt', async () => {
    const watched = await readWatchedAddresses()
    const balances: Record<string, { balance: string; decimals: number } | null> = {}

    const cfg = await readAppConfig()

    for (const w of watched) {
      balances[w.address] = await fetchUsdtBalance({
        address: w.address,
        apiBase: cfg.trongrid.apiBase,
        apiKey: cfg.trongrid.apiKey
      })
      await sleep(200)
    }

    return balances
  })

  ipcMain.handle(
    'transfers:fetchUsdt',
    async (_evt, input: { start?: number; limit?: number; apiBase?: string }) => {
      const start = typeof input?.start === 'number' ? input.start : 0
      const limit = typeof input?.limit === 'number' ? input.limit : 20

      const watched = await readWatchedAddresses()
      const watchedAddresses = watched.map((w) => w.address)

      if (watchedAddresses.length === 0) return []

      const cfg = await readAppConfig()

      return await fetchAggregatedUsdtTransfers({
        watchedAddresses,
        start,
        limit,
        apiBase: cfg.trongrid.apiBase,
        apiKey: cfg.trongrid.apiKey
      })
    }
  )

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
