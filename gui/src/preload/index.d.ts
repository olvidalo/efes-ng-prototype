import { ElectronAPI } from '@electron-toolkit/preload'

interface PipelineAPI {
  openProject(): Promise<{ name: string; nodeNames: string[]; serverUrl: string } | null>
  build(): Promise<void>
  startWatch(): Promise<void>
  stopWatch(): Promise<void>
  clean(): Promise<void>
  openNodeOutput(nodeName: string): Promise<void>
  nodeOutputExists(nodeName: string): Promise<boolean>
  onEvent(callback: (event: PipelineEvent) => void): () => void
}

interface PipelineEvent {
  type: string
  name?: string
  nodeCount?: number
  durationMs?: number
  error?: string
  event?: string
  path?: string
  paths?: string[]
  timings?: [string, number][]
  cacheStats?: { hits: number; total: number } | null
  completed?: number
  total?: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PipelineAPI
  }
}
