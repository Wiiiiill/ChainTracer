import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { WindowApi } from './types'

// Custom APIs for renderer
const api: WindowApi = {
  addressesList: () => ipcRenderer.invoke('addresses:list'),
  addressesAdd: (input) => ipcRenderer.invoke('addresses:add', input),
  addressesRemove: (input) => ipcRenderer.invoke('addresses:remove', input),
  addressesUpdateLabel: (input) => ipcRenderer.invoke('addresses:updateLabel', input),
  transfersFetchUsdt: (input) => ipcRenderer.invoke('transfers:fetchUsdt', input),
  balancesUsdt: () => ipcRenderer.invoke('balances:usdt'),
  clipboardCopy: (text) => ipcRenderer.invoke('clipboard:copy', { text })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
