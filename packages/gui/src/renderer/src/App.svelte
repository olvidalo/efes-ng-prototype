<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { pipelineState } from './lib/pipeline-state.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import NodeList from './components/NodeList.svelte'
  import NodeInspector from './components/NodeInspector.svelte'
  import LogPanel from './components/LogPanel.svelte'
  import CreateProjectDialog from './components/CreateProjectDialog.svelte'

  let cleanup: (() => void) | null = null
  let refreshTrigger = $state(0)
  let statusMessage = $state('')
  let showCreateDialog = $state(false)
  let selectedNode = $state<string | null>(null)
  let nodeInfo = $state<any>(null)
  let activeLogTab = $state<'log' | 'messages'>('log')
  let messageFilterNode = $state<string | null>(null)

  function handleShowMessages(nodeName: string) {
    messageFilterNode = nodeName
    activeLogTab = 'messages'
  }

  async function handleSelectNode(name: string | null) {
    selectedNode = name
    if (name) {
      nodeInfo = null
      nodeInfo = await window.api.getNodeInfo(name)
    } else {
      nodeInfo = null
    }
  }

  onMount(() => {
    cleanup = window.api.onEvent((event) => {
      pipelineState.handleEvent(event)
      // Refresh inspector when build completes
      if ((event.type === 'pipeline:done' || event.type === 'watch:rebuild:done') && selectedNode) {
        window.api.getNodeInfo(selectedNode).then((info) => { nodeInfo = info })
      }
    })
  })

  onDestroy(() => {
    cleanup?.()
  })

  async function handleOpenProject() {
    try {
      const result = await window.api.openProject()
      if (result) {
        selectedNode = null
        nodeInfo = null
        pipelineState.setPipelineInfo(result.name, result.nodeNames, result.serverUrl)
      }
    } catch (err: any) {
      pipelineState.addLog(`Failed to open project: ${err.message}`)
    }
  }

  async function handleStart() {
    pipelineState.phase = 'building'
    try {
      await window.api.startWatch()
    } catch (err: any) {
      pipelineState.addLog(`Start failed: ${err.message}`)
      pipelineState.phase = 'ready'
    }
  }

  async function handleCancel() {
    try {
      await window.api.cancelBuild()
    } catch (err: any) {
      pipelineState.addLog(`Cancel failed: ${err.message}`)
    }
  }

  async function handleStop() {
    try {
      await window.api.stopWatch()
    } catch (err: any) {
      pipelineState.addLog(`Stop failed: ${err.message}`)
    }
    pipelineState.phase = 'ready'
  }

  function handleClean() {
    pipelineState.addLog('Cleaning...')
    window.api.clean().then(() => {
      pipelineState.addLog('Caches cleared.')
      refreshTrigger++
      statusMessage = 'Clean complete'
      setTimeout(() => { statusMessage = '' }, 3000)
    }).catch((err: any) => {
      pipelineState.addLog(`Clean failed: ${err.message}`)
    })
  }

  async function handleCreateProject(outputDir: string, answers: Record<string, string>) {
    const projectDir = await window.api.createProject(outputDir, answers)
    showCreateDialog = false
    // Open the newly created project
    const result = await window.api.openProjectDir(projectDir)
    if (result) {
      selectedNode = null
      nodeInfo = null
      pipelineState.setPipelineInfo(result.name, result.nodeNames, result.serverUrl)
    }
  }

  function handleOpenPreview() {
    if (pipelineState.serverUrl) {
      window.open(pipelineState.serverUrl, '_blank')
    }
  }
</script>

<main>
  <Toolbar
    phase={pipelineState.phase}
    pipelineName={pipelineState.pipelineName}
    serverUrl={pipelineState.serverUrl}
    onNewProject={() => { showCreateDialog = true }}
    onOpenProject={handleOpenProject}
    onStart={handleStart}
    onStop={handleStop}
    onCancel={handleCancel}
    onClean={handleClean}
    onOpenPreview={handleOpenPreview}
  />
  <div class="content">
    <NodeList nodes={pipelineState.nodes} {refreshTrigger} {selectedNode} onSelectNode={handleSelectNode} onShowMessages={handleShowMessages} />
    {#if selectedNode}
      <NodeInspector
        nodeName={selectedNode}
        info={nodeInfo}
        onClose={() => handleSelectNode(null)}
        onSelectNode={handleSelectNode}
      />
    {/if}
  </div>
  {#if statusMessage}
    <div class="status-flash">{statusMessage}</div>
  {/if}
  <LogPanel
    logs={pipelineState.logs}
    messages={pipelineState.getMessages(messageFilterNode ?? undefined)}
    activeTab={activeLogTab}
    filterNode={messageFilterNode}
    onTabChange={(tab) => { activeLogTab = tab; if (tab === 'log') messageFilterNode = null }}
    onFilterClear={() => { messageFilterNode = null }}
  />
</main>

{#if showCreateDialog}
  <CreateProjectDialog
    onClose={() => { showCreateDialog = false }}
    onCreate={handleCreateProject}
  />
{/if}

<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: row;
  }

  .status-flash {
    padding: 4px 12px;
    background: var(--ev-c-success-bg);
    color: var(--ev-c-success-text);
    font-size: 12px;
    text-align: center;
  }
</style>
