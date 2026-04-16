interface NodeMessage {
  text: string
  sourceFile: string | null
}

interface NodeState {
  name: string
  status: 'pending' | 'running' | 'done' | 'error'
  durationMs?: number
  error?: string
  fullyCached?: boolean
  itemCompleted?: number
  itemTotal?: number
  messages: NodeMessage[]
}

interface LogEntry {
  time: Date
  message: string
}

function createPipelineState() {
  let phase = $state<'idle' | 'ready' | 'building' | 'watching'>('idle')
  let pipelineName = $state('')
  let nodes = $state<NodeState[]>([])
  let logs = $state<LogEntry[]>([])
  let serverUrl = $state('')

  function addLog(message: string) {
    logs.push({ time: new Date(), message })
  }

  function resetNodes() {
    for (const node of nodes) {
      node.status = 'pending'
      node.durationMs = undefined
      node.error = undefined
      node.itemCompleted = undefined
      node.itemTotal = undefined
      node.messages = []
    }
  }

  function setPipelineInfo(name: string, nodeNames: string[], url: string) {
    pipelineName = name
    nodes = nodeNames.map((n) => ({ name: n, status: 'pending' as const, messages: [] }))
    serverUrl = url
    phase = 'ready'
    logs = []
    addLog(`Loaded pipeline: ${name} (${nodeNames.length} nodes)`)
    addLog(`Preview server at ${url}`)
  }

  function handleEvent(event: any) {
    switch (event.type) {
      case 'pipeline:start':
        resetNodes()
        addLog(`Pipeline started (${event.nodeCount} nodes)`)
        break

      case 'pipeline:done':
        phase = 'watching'
        addLog(`Pipeline completed in ${(event.durationMs / 1000).toFixed(2)}s`)
        break

      case 'pipeline:cancelled':
        phase = 'watching'
        addLog('Build cancelled')
        break

      case 'pipeline:error':
        phase = 'watching'
        addLog(`Pipeline failed: ${event.error}`)
        break

      case 'node:start': {
        const node = nodes.find((n) => n.name === event.name)
        if (node) node.status = 'running'
        break
      }

      case 'node:done': {
        const node = nodes.find((n) => n.name === event.name)
        if (node) {
          node.status = 'done'
          node.durationMs = event.durationMs
          const cs = event.cacheStats
          node.fullyCached = cs != null && cs.total > 0 && cs.hits === cs.total
        }
        break
      }

      case 'node:progress': {
        const node = nodes.find((n) => n.name === event.name)
        if (node) {
          node.itemCompleted = event.completed
          node.itemTotal = event.total
        }
        break
      }

      case 'node:message': {
        const node = nodes.find((n) => n.name === event.name)
        if (node) {
          node.messages.push({ text: event.text, sourceFile: event.sourceFile })
        }
        break
      }

      case 'node:error': {
        const node = nodes.find((n) => n.name === event.name)
        if (node) {
          node.status = 'error'
          node.error = event.error
        }
        addLog(`Error in ${event.name}: ${event.error}`)
        break
      }

      case 'watch:ready':
        addLog(`Watching ${event.paths?.length ?? 0} paths for changes`)
        break

      case 'watch:change':
        addLog(`File changed: ${event.path}`)
        break

      case 'watch:rebuild:start':
        resetNodes()
        addLog(event.files?.length
          ? `Rebuild triggered by ${event.files.length} file(s): ${event.files.join(', ')}`
          : 'Rebuild triggered')
        break

      case 'watch:rebuild:done':
        addLog(`Rebuild complete in ${(event.durationMs / 1000).toFixed(2)}s`)
        break

      case 'watch:rebuild:error':
        addLog(`Rebuild failed: ${event.error}`)
        break

      case 'pipeline:reloaded':
        pipelineName = event.name
        nodes = event.nodeNames.map((n: string) => ({ name: n, status: 'pending' as const, messages: [] }))
        addLog(`Pipeline config reloaded: ${event.name} (${event.nodeNames.length} nodes)`)
        break
    }
  }

  /** All node messages from the current build. filterNode matches exact name or child nodes (prefix match). */
  function getMessages(filterNode?: string): { nodeName: string, text: string, sourceFile: string | null }[] {
    const result: { nodeName: string, text: string, sourceFile: string | null }[] = []
    for (const node of nodes) {
      if (filterNode && node.name !== filterNode && !node.name.startsWith(filterNode + ':')) continue
      for (const msg of node.messages) {
        result.push({ nodeName: node.name, text: msg.text, sourceFile: msg.sourceFile })
      }
    }
    return result
  }

  return {
    get phase() {
      return phase
    },
    set phase(v) {
      phase = v
    },
    get pipelineName() {
      return pipelineName
    },
    get nodes() {
      return nodes
    },
    get logs() {
      return logs
    },
    get serverUrl() {
      return serverUrl
    },
    set serverUrl(v) {
      serverUrl = v
    },
    get totalMessageCount() {
      return nodes.reduce((sum, n) => sum + n.messages.length, 0)
    },
    setPipelineInfo,
    handleEvent,
    addLog,
    getMessages
  }
}

export const pipelineState = createPipelineState()
