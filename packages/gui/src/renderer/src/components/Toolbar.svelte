<script lang="ts">
  interface Props {
    phase: 'idle' | 'ready' | 'building' | 'watching'
    pipelineName: string
    serverUrl: string
    onOpenProject: () => void
    onStart: () => void
    onStop: () => void
    onCancel: () => void
    onClean: () => void
    onOpenPreview: () => void
  }

  let {
    phase,
    pipelineName,
    serverUrl,
    onOpenProject,
    onStart,
    onStop,
    onCancel,
    onClean,
    onOpenPreview
  }: Props = $props()
</script>

<div class="toolbar">
  <button onclick={onOpenProject}>Open Project</button>

  {#if phase === 'building'}
    <button onclick={onCancel}>Cancel</button>
  {:else if phase === 'watching'}
    <button onclick={onStop}>Stop</button>
  {:else}
    <button onclick={onStart} disabled={phase === 'idle'}>Start</button>
  {/if}

  <button onclick={onClean} disabled={phase !== 'ready'}>Clean</button>

  <button onclick={onOpenPreview} disabled={!serverUrl}>
    Preview
  </button>

  {#if pipelineName}
    <span class="pipeline-name">{pipelineName}</span>
  {/if}

  {#if phase === 'watching'}
    <span class="watching-indicator">● Watching</span>
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

  .watching-indicator {
    color: #4caf50;
    font-size: 13px;
    font-weight: 500;
  }
</style>
