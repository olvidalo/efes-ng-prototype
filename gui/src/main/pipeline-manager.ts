import { BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { DevServer } from './dev-server'

export class PipelineManager {
  private pipeline: any = null
  private watcher: any = null
  private building = false
  private tsxRegistered = false
  private devServer: DevServer | null = null

  constructor(private mainWindow: BrowserWindow) {}

  /** Register tsx CJS loader once so require() resolves .ts files */
  private async ensureTsxLoader(): Promise<void> {
    if (this.tsxRegistered) return
    const tsx = await import('tsx/cjs/api')
    tsx.register()
    this.tsxRegistered = true
  }

  async openProject(projectDir: string): Promise<{ name: string; nodeNames: string[]; serverUrl: string }> {
    await this.dispose()

    const absDir = path.resolve(projectDir)
    if (!fs.existsSync(absDir)) {
      throw new Error(`Project directory not found: ${absDir}`)
    }

    const pipelineFiles = fs.readdirSync(absDir).filter(f => f.endsWith('.pipeline.ts'))
    if (pipelineFiles.length === 0) {
      throw new Error(`No *.pipeline.ts found in ${absDir}`)
    }
    if (pipelineFiles.length > 1) {
      throw new Error(`Multiple pipeline files found: ${pipelineFiles.join(', ')}`)
    }

    const pipelineFilePath = path.resolve(absDir, pipelineFiles[0])

    // chdir for node compat (nodes may use relative paths with fs)
    process.chdir(absDir)

    // Load pipeline via tsx CJS loader
    await this.ensureTsxLoader()
    const mod = require(pipelineFilePath)
    this.pipeline = mod.default

    // Set projectDir (Phase A feature)
    this.pipeline.projectDir = absDir

    // Remove default console listeners, install event forwarding
    this.pipeline.removeAllListeners()
    this.installEventForwarding()

    // Start dev server for live preview
    const { url } = await this.startDevServer()

    const nodeNames = this.pipeline.getNodeNames()
    return { name: this.pipeline.name, nodeNames, serverUrl: url }
  }

  async build(): Promise<void> {
    if (!this.pipeline) throw new Error('No pipeline loaded')
    if (this.building) throw new Error('Build already in progress')
    this.building = true
    try {
      await this.pipeline.run()
    } finally {
      this.building = false
    }
  }

  async startWatch(): Promise<void> {
    if (!this.pipeline) throw new Error('No pipeline loaded')

    await this.ensureTsxLoader()
    const { PipelineWatcher } = require('efes-ng-phase-2-poc')

    this.watcher = new PipelineWatcher(this.pipeline)
    // Fire-and-forget — watcher.start() never resolves (keeps process alive via await)
    this.watcher.start().catch((err: any) => {
      this.send('pipeline:event', { type: 'watch:error', error: err.message })
    })
  }

  async stopWatch(): Promise<void> {
    if (this.watcher) {
      await this.watcher.stop()
      this.watcher = null
    }
  }

  async clean(): Promise<void> {
    if (!this.pipeline) throw new Error('No pipeline loaded')
    const cacheDir = path.resolve(this.pipeline.projectDir, this.pipeline.cacheDir)
    const buildDir = path.resolve(this.pipeline.projectDir, this.pipeline.buildDir)
    for (const dir of [cacheDir, buildDir]) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true })
      }
    }
    // Clean all node output directories (covers custom outputConfig.to paths like 2-intermediate/)
    for (const name of this.pipeline.getNodeNames()) {
      try {
        const dir = this.pipeline.getNodeOutputDir(name)
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true })
        }
      } catch { /* node may not have output dir */ }
    }
    // Clear output contents but keep the directory (sirv needs it)
    const outputDir = path.resolve(this.pipeline.projectDir, '3-output')
    if (fs.existsSync(outputDir)) {
      for (const entry of fs.readdirSync(outputDir)) {
        fs.rmSync(path.join(outputDir, entry), { recursive: true })
      }
    }
    this.devServer?.broadcast({ type: 'empty' })
  }

  private async startDevServer(): Promise<{ port: number; url: string }> {
    if (!this.pipeline) throw new Error('No pipeline loaded')
    if (this.devServer?.isRunning()) throw new Error('Dev server already running')

    const outputDir = path.resolve(this.pipeline.projectDir, '3-output')

    // Ensure dir exists (sirv needs it)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    this.devServer = new DevServer()
    const port = await this.devServer.start(outputDir)
    const url = `http://localhost:${port}`

    // Check if output dir is empty
    const files = fs.readdirSync(outputDir)
    if (files.length === 0) {
      this.devServer.broadcast({ type: 'empty' })
    }

    return { port, url }
  }

  async stopDevServer(): Promise<void> {
    if (this.devServer) {
      await this.devServer.stop()
      this.devServer = null
    }
  }

  getNodeOutputDir(nodeName: string): string | null {
    if (!this.pipeline) return null
    try {
      return this.pipeline.getNodeOutputDir(nodeName)
    } catch {
      return null
    }
  }

  async dispose(): Promise<void> {
    await this.stopDevServer()
    await this.stopWatch()
    if (this.pipeline) {
      await this.pipeline.shutdown()
      this.pipeline = null
    }
  }

  private send(channel: string, data: any): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  private installEventForwarding(): void {
    // Intercept all emitted events and forward to renderer
    const originalEmit = this.pipeline.emit.bind(this.pipeline)
    this.pipeline.emit = (event: string, ...args: any[]) => {
      if (typeof event === 'string' && args.length > 0 && typeof args[0] === 'object') {
        const data = args[0]
        const serialized = { ...data, type: event }
        if (data?.error instanceof Error) {
          serialized.error = data.error.message
        }
        this.send('pipeline:event', serialized)

        // Broadcast to dev server for live preview overlays
        if (this.devServer?.isRunning()) {
          switch (event) {
            case 'pipeline:start':
            case 'watch:rebuild:start':
              this.devServer.broadcast({ type: 'building' })
              break
            case 'pipeline:done':
            case 'watch:rebuild:done':
              this.devServer.broadcast({ type: 'done' })
              break
            case 'node:error':
            case 'watch:rebuild:error':
              this.devServer.broadcast({
                type: 'error',
                error: serialized.error || 'Unknown error'
              })
              break
          }
        }
      }
      return originalEmit(event, ...args)
    }
  }
}
