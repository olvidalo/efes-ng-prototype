import { BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { DevServer } from './dev-server'
import { NodeRegistry } from '../../../src/core/nodeRegistry'
import type { DescribedNode } from '../../../src/core/nodeConfigSchema'

export interface NodeInfo {
  outputKeys: string[]
  outputs: Record<string, string[]>
  dependencies: string[]
  outputDir: string
  nodeType: string
  description: string | null
  cacheStats: { hits: number; total: number } | null
  config: Record<string, any>
}

export class PipelineManager {
  private pipeline: any = null
  private watcher: any = null
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
    // Tell any open preview tabs to navigate to root before tearing down
    this.devServer?.broadcast({ type: 'reload' })
    await this.dispose()

    const absDir = path.resolve(projectDir)

    // chdir for node compat (nodes may use relative paths with fs)
    process.chdir(absDir)

    await this.ensureTsxLoader()
    const { discoverPipelineFile, loadPipelineFromXml } = require('efes-ng-phase-2-poc')
    const { filePath, format } = discoverPipelineFile(absDir)

    if (format === 'xml') {
      this.pipeline = await loadPipelineFromXml(filePath)
    } else {
      const mod = require(filePath)
      this.pipeline = mod.default
    }

    this.pipeline.projectDir = absDir

    // Remove default console listeners, install event forwarding
    this.pipeline.removeAllListeners()
    this.installEventForwarding()

    // Start dev server for live preview
    const { url } = await this.startDevServer()

    const nodeNames = this.pipeline.getNodeNames()
    return { name: this.pipeline.name, nodeNames, serverUrl: url }
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

  async cancelBuild(): Promise<void> {
    if (!this.pipeline) throw new Error('No pipeline loaded')
    await this.pipeline.cancel()
  }

  async stopWatch(): Promise<void> {
    if (this.watcher) {
      await this.watcher.stop()
      this.watcher = null
    }
    this.devServer?.broadcast({ type: 'stopped' })
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

    // Set initial overlay state — pipeline isn't running yet
    const files = fs.readdirSync(outputDir)
    this.devServer.broadcast({ type: files.length === 0 ? 'empty' : 'stopped' })

    return { port, url }
  }

  private async stopDevServer(): Promise<void> {
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

  getNodeInfo(nodeName: string): NodeInfo | null {
    if (!this.pipeline) return null
    try {
      const node = this.pipeline.getNodeData(nodeName)
      const ctor = node.constructor as any

      // Output keys from static class property
      const outputKeys: string[] = ctor.outputKeys ? [...ctor.outputKeys] : []

      // Actual output files grouped by key (only available after a run)
      // stripBuildPrefix removes .efes-build/node-name/ but preserves input structure (e.g. 1-input/)
      const rawOutputs = this.pipeline.getNodeOutputs(nodeName)
      const outputs: Record<string, string[]> = {}
      if (rawOutputs) {
        for (const outputObj of rawOutputs) {
          for (const [key, paths] of Object.entries(outputObj)) {
            if (!outputs[key]) outputs[key] = []
            outputs[key].push(...(paths as string[]).map((p: string) => this.pipeline.stripBuildPrefix(p)))
          }
        }
      }

      // Dependencies
      const dependencies = this.pipeline.getDependenciesOf(nodeName)

      // Output directory (relative to project)
      const absOutputDir = this.pipeline.getNodeOutputDir(nodeName)
      const outputDir = path.relative(this.pipeline.projectDir, absOutputDir)

      // Node type name
      const nodeType = NodeRegistry.nameOf(ctor as DescribedNode) || ctor.name || 'unknown'

      // Description
      const description = ctor.description || null

      // Cache stats
      const cacheStats = node.cacheStats || null

      // Config (sanitized - serialize tagged input refs for structured rendering)
      const serializeValue = (value: any): any => {
        if (value == null) return value
        if (Array.isArray(value)) return value.map(serializeValue)
        if (typeof value !== 'object') return value
        // NodeOutputReference: has node + output, no type field
        if ('node' in value && 'output' in value) {
          const ref: any = { tag: 'from', node: value.node?.name ?? value.node, output: value.output }
          if (value.glob) ref.glob = value.glob
          return ref
        }
        // FilesRef, CollectRef, AbsolutePath: discriminated by type field
        if (value.type === 'files') return { tag: 'files', patterns: value.patterns }
        if (value.type === 'collect') return { tag: 'collect', dir: value.dir }
        if (value.type === 'absolute') return { tag: 'absolute', path: value.path }
        // Only recurse into plain objects — skip class instances (e.g. PipelineNode)
        if (Object.getPrototypeOf(value) !== Object.prototype) {
          return String(value)
        }
        const result: Record<string, any> = {}
        for (const [k, v] of Object.entries(value)) {
          result[k] = serializeValue(v)
        }
        return result
      }
      const config: Record<string, any> = {}
      if (node.config?.config) {
        for (const [key, value] of Object.entries(node.config.config)) {
          config[key] = serializeValue(value)
        }
      }

      return { outputKeys, outputs, dependencies, outputDir, nodeType, description, cacheStats, config }
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
