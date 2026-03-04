<script lang="ts">
  interface NodeState {
    name: string
    status: 'pending' | 'running' | 'done' | 'error'
    durationMs?: number
    error?: string
    fullyCached?: boolean
    itemCompleted?: number
    itemTotal?: number
  }

  interface Props {
    nodes: NodeState[]
    refreshTrigger?: number
    selectedNode?: string | null
    onSelectNode?: (name: string | null) => void
  }

  let { nodes, refreshTrigger = 0, selectedNode = null, onSelectNode }: Props = $props()

  let outputExists: Record<string, boolean> = $state({})

  async function refreshOutputExists(): Promise<void> {
    const result: Record<string, boolean> = {}
    for (const node of nodes) {
      result[node.name] = await window.api.nodeOutputExists(node.name)
    }
    outputExists = result
  }

  // Refresh when node list changes, any node completes, or refreshTrigger changes
  $effect(() => {
    const doneCount = nodes.filter((n) => n.status === 'done' || n.status === 'error').length
    if (nodes.length > 0) {
      // use doneCount and refreshTrigger to trigger reactivity
      void doneCount
      void refreshTrigger
      refreshOutputExists()
    }
  })

  let building = $derived(nodes.some((n) => n.status === 'running'))
  let progressPct = $derived(() => {
    if (nodes.length === 0) return 0
    let sum = 0
    for (const n of nodes) {
      if (n.status === 'done' || n.status === 'error') sum += 1
      else if (n.status === 'running' && n.itemTotal && n.itemTotal > 0) sum += n.itemCompleted! / n.itemTotal
    }
    return (sum / nodes.length) * 100
  })

  const statusIcon: Record<string, string> = {
    pending: ' ',
    running: '*',
    done: 'v',
    error: 'x'
  }
</script>

<div class="node-list">
  {#if nodes.length === 0}
    <div class="empty">No pipeline loaded</div>
  {:else}
    {#if building}
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progressPct()}%"></div>
      </div>
    {/if}
    {#each nodes as node}
      <div
        class="node"
        class:running={node.status === 'running'}
        class:done={node.status === 'done'}
        class:error={node.status === 'error'}
        class:selected={selectedNode === node.name}
        onclick={() => onSelectNode?.(selectedNode === node.name ? null : node.name)}
        role="button"
        tabindex="0"
      >
        <span class="status" class:cached={node.fullyCached} class:status-pending={node.status === 'pending'} class:status-running={node.status === 'running'} class:status-done={node.status === 'done'} class:status-error={node.status === 'error'}>{node.fullyCached ? '-' : statusIcon[node.status]}</span>
        <span class="name">{node.name}</span>
        {#if node.status === 'running' && node.itemTotal}
          <span class="item-progress">{node.itemCompleted} / {node.itemTotal}</span>
        {/if}
        {#if outputExists[node.name]}
          <button class="open-output" title="Open output directory" onclick={() => window.api.openNodeOutput(node.name)}>&#x1F4C2;</button>
        {/if}
        {#if node.durationMs !== undefined}
          <span class="duration">{(node.durationMs / 1000).toFixed(2)}s</span>
        {/if}
        {#if node.error}
          <span class="error-msg">{node.error}</span>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .node-list {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    padding: 8px 12px;
  }

  .progress-bar {
    height: 3px;
    background: var(--color-background-mute, #2a2a2a);
    border-radius: 2px;
    margin-bottom: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.2s ease;
  }

  .empty {
    color: var(--color-text-3, #666);
    padding: 20px;
    text-align: center;
  }

  .node {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 3px 4px;
    margin: 0 -4px;
    border-radius: 3px;
    font-size: 13px;
    transition: background 0.1s;
    cursor: pointer;
  }

  .node:hover {
    background: var(--color-background-mute, rgba(255, 255, 255, 0.05));
  }

  .node.selected {
    background: rgba(59, 130, 246, 0.1);
  }

  .status {
    width: 14px;
    text-align: center;
    font-weight: bold;
  }

  .status-pending { color: var(--color-text-3, #666); }
  .status-running { color: #f0c040; }
  .status-done { color: #4caf50; }
  .status-error { color: #f44336; }
  .cached { color: var(--color-text-3, #888); }

  .name {
    color: var(--color-text, #eee);
    user-select: text;
    cursor: text;
  }

  .running .name {
    color: #f0c040;
  }

  .item-progress {
    color: #f0c040;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .open-output {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 2px;
    font-size: 12px;
    opacity: 0.4;
    transition: opacity 0.15s;
    margin-left: auto;
  }

  .open-output:hover {
    opacity: 1;
  }

  .duration {
    color: var(--color-text-3, #888);
    font-variant-numeric: tabular-nums;
  }

  .error-msg {
    color: #f44336;
    font-size: 12px;
  }
</style>
