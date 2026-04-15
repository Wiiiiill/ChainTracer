import { ElectronAPI } from '@electron-toolkit/preload'
import type { WindowApi } from './types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowApi
  }
}
