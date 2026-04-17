import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openProject: (): Promise<{ name: string; nodeNames: string[]; serverUrl: string } | null> =>
    ipcRenderer.invoke('pipeline:open-project'),
  openProjectDir: (dir: string): Promise<{ name: string; nodeNames: string[]; serverUrl: string } | null> =>
    ipcRenderer.invoke('pipeline:open-project-dir', dir),
  startWatch: (): Promise<void> => ipcRenderer.invoke('pipeline:watch'),
  cancelBuild: (): Promise<void> => ipcRenderer.invoke('pipeline:cancel'),
  stopWatch: (): Promise<void> => ipcRenderer.invoke('pipeline:stop-watch'),
  clean: (): Promise<void> => ipcRenderer.invoke('pipeline:clean'),
  openNodeOutput: (nodeName: string): Promise<void> =>
    ipcRenderer.invoke('pipeline:open-node-output', nodeName),
  nodeOutputExists: (nodeName: string): Promise<boolean> =>
    ipcRenderer.invoke('pipeline:node-output-exists', nodeName),
  getNodeInfo: (nodeName: string): Promise<any> =>
    ipcRenderer.invoke('pipeline:get-node-info', nodeName),
  onEvent: (callback: (event: any) => void): (() => void) => {
    const handler = (_e: any, data: any): void => callback(data)
    ipcRenderer.on('pipeline:event', handler)
    return () => ipcRenderer.removeListener('pipeline:event', handler)
  },
  // Scaffold wizard
  getScaffoldQuestions: (): Promise<any[]> =>
    ipcRenderer.invoke('scaffold:get-questions'),
  computeScaffoldDefaults: (answers: Record<string, string>): Promise<Record<string, string>> =>
    ipcRenderer.invoke('scaffold:compute-defaults', answers),
  validateScaffoldAnswers: (answers: Record<string, string>): Promise<{ errors?: Record<string, string> }> =>
    ipcRenderer.invoke('scaffold:validate', answers),
  showDirectoryPicker: (): Promise<string | null> =>
    ipcRenderer.invoke('scaffold:pick-directory'),
  createProject: (outputDir: string, answers: Record<string, string>): Promise<string> =>
    ipcRenderer.invoke('scaffold:create', outputDir, answers)
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
