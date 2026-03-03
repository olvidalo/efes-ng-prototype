import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openProject: (): Promise<{ name: string; nodeNames: string[]; serverUrl: string } | null> =>
    ipcRenderer.invoke('pipeline:open-project'),
  build: (): Promise<void> => ipcRenderer.invoke('pipeline:build'),
  startWatch: (): Promise<void> => ipcRenderer.invoke('pipeline:watch'),
  stopWatch: (): Promise<void> => ipcRenderer.invoke('pipeline:stop-watch'),
  clean: (): Promise<void> => ipcRenderer.invoke('pipeline:clean'),
  onEvent: (callback: (event: any) => void): (() => void) => {
    const handler = (_e: any, data: any): void => callback(data)
    ipcRenderer.on('pipeline:event', handler)
    return () => ipcRenderer.removeListener('pipeline:event', handler)
  }
}

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
