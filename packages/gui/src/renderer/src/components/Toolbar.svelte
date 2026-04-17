<script lang="ts">
  import { FolderOpen, Plus, Play, Square, X, Trash2, Eye } from 'lucide-svelte'

  interface Props {
    phase: 'idle' | 'ready' | 'building' | 'watching'
    pipelineName: string
    serverUrl: string
    onNewProject: () => void
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
    onNewProject,
    onOpenProject,
    onStart,
    onStop,
    onCancel,
    onClean,
    onOpenPreview
  }: Props = $props()
</script>

<div class="toolbar">
  <button onclick={onNewProject} title="New Project">
    <Plus size={15} />
    <span>New</span>
  </button>

  <button onclick={onOpenProject} title="Open Project">
    <FolderOpen size={15} />
    <span>Open</span>
  </button>

  {#if phase === 'building'}
    <button onclick={onCancel} title="Cancel Build">
      <X size={15} />
      <span>Cancel</span>
    </button>
  {:else if phase === 'watching'}
    <button onclick={onStop} title="Stop Watching">
      <Square size={15} />
      <span>Stop</span>
    </button>
  {:else}
    <button onclick={onStart} disabled={phase === 'idle'} title="Start Build & Watch">
      <Play size={15} />
      <span>Start</span>
    </button>
  {/if}

  <button onclick={onClean} disabled={phase !== 'ready'} title="Clean Build Outputs">
    <Trash2 size={15} />
    <span>Clean</span>
  </button>

  <button onclick={onOpenPreview} disabled={!serverUrl} title="Open Preview in Browser">
    <Eye size={15} />
    <span>Preview</span>
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
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-background-soft);
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background-mute);
    color: var(--color-text);
    cursor: pointer;
    font-size: 13px;
    transition: background 0.1s;
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
