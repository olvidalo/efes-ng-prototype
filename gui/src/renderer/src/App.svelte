<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { pipelineState } from './lib/pipeline-state.svelte'
  import Toolbar from './components/Toolbar.svelte'
  import NodeList from './components/NodeList.svelte'
  import LogPanel from './components/LogPanel.svelte'

  let cleanup: (() => void) | null = null

  onMount(() => {
    cleanup = window.api.onEvent((event) => {
      pipelineState.handleEvent(event)
    })
  })

  onDestroy(() => {
    cleanup?.()
  })

  async function handleOpenProject() {
    try {
      const result = await window.api.openProject()
      if (result) {
        pipelineState.setPipelineInfo(result.name, result.nodeNames, result.serverUrl)
      }
    } catch (err: any) {
      pipelineState.addLog(`Failed to open project: ${err.message}`)
    }
  }

  async function handleBuild() {
    pipelineState.phase = 'building'
    try {
      await window.api.build()
    } catch (err: any) {
      pipelineState.addLog(`Build failed: ${err.message}`)
    } finally {
      if (pipelineState.phase === 'building') {
        pipelineState.phase = 'loaded'
      }
    }
  }

  async function handleClean() {
    try {
      await window.api.clean()
      pipelineState.addLog('Caches cleared.')
    } catch (err: any) {
      pipelineState.addLog(`Clean failed: ${err.message}`)
    }
  }

  async function handleStartWatch() {
    pipelineState.phase = 'watching'
    try {
      await window.api.startWatch()
    } catch (err: any) {
      pipelineState.addLog(`Watch failed: ${err.message}`)
      pipelineState.phase = 'loaded'
    }
  }

  async function handleStopWatch() {
    try {
      await window.api.stopWatch()
    } catch (err: any) {
      pipelineState.addLog(`Stop watch failed: ${err.message}`)
    }
    pipelineState.phase = 'loaded'
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
    onOpenProject={handleOpenProject}
    onBuild={handleBuild}
    onClean={handleClean}
    onStartWatch={handleStartWatch}
    onStopWatch={handleStopWatch}
    onOpenPreview={handleOpenPreview}
  />
  <div class="content">
    <NodeList nodes={pipelineState.nodes} />
  </div>
  <LogPanel logs={pipelineState.logs} />
</main>

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
    flex-direction: column;
  }
</style>
