<script lang="ts">
  interface Props {
    phase: 'idle' | 'loaded' | 'building' | 'watching'
    pipelineName: string
    serverUrl: string
    onOpenProject: () => void
    onBuild: () => void
    onClean: () => void
    onStartWatch: () => void
    onStopWatch: () => void
    onOpenPreview: () => void
  }

  let {
    phase,
    pipelineName,
    serverUrl,
    onOpenProject,
    onBuild,
    onClean,
    onStartWatch,
    onStopWatch,
    onOpenPreview
  }: Props = $props()
</script>

<div class="toolbar">
  <button onclick={onOpenProject}>Open Project</button>

  <button onclick={onBuild} disabled={phase === 'idle' || phase === 'building'}>
    {phase === 'building' ? 'Building...' : 'Build'}
  </button>

  <button onclick={onClean} disabled={phase === 'idle' || phase === 'building'}>
    Clean
  </button>

  {#if phase === 'watching'}
    <button onclick={onStopWatch}>Stop Watch</button>
  {:else}
    <button onclick={onStartWatch} disabled={phase === 'idle' || phase === 'building'}>
      Watch
    </button>
  {/if}

  <button onclick={onOpenPreview} disabled={!serverUrl}>
    Preview
  </button>

  {#if pipelineName}
    <span class="pipeline-name">{pipelineName}</span>
  {/if}
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-background-soft);
  }

  button {
    padding: 6px 14px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background-mute);
    color: var(--color-text);
    cursor: pointer;
    font-size: 13px;
  }

  button:hover:not(:disabled) {
    background: var(--color-hover-bg);
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pipeline-name {
    margin-left: auto;
    color: var(--color-text-2);
    font-size: 13px;
  }
</style>
