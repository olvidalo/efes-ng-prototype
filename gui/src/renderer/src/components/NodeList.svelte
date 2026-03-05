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

  // Build a set of all node names for parent lookup
  let nodeNameSet = $derived(new Set(nodes.map((n) => n.name)))

  /** Find immediate parent: longest colon-prefix that exists as a node */
  function getParent(name: string): string | null {
    const parts = name.split(':')
    for (let i = parts.length - 1; i >= 1; i--) {
      const prefix = parts.slice(0, i).join(':')
      if (nodeNameSet.has(prefix)) return prefix
    }
    return null
  }

  /** Compute nesting depth: count how many colon-delimited prefixes exist as actual nodes */
  function getDepth(name: string): number {
    const parts = name.split(':')
    let depth = 0
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join(':')
      if (nodeNameSet.has(prefix)) depth++
    }
    return depth
  }

  /** Display name: show only the last segment for nested nodes */
  function displayName(name: string): string {
    const depth = getDepth(name)
    if (depth === 0) return name
    const parts = name.split(':')
    return parts[parts.length - 1]
  }

  /**
   * Reorder nodes for display: parents before children, preserving original
   * order for unrelated nodes. The pipeline's topological order puts children
   * (dependencies) before parents, which breaks visual tree rendering.
   */
  let displayNodes = $derived.by(() => {
    const originalIndex = new Map(nodes.map((n, i) => [n.name, i]))

    // Group children under their immediate parent
    const childrenOf = new Map<string, NodeState[]>()
    const roots: NodeState[] = []

    for (const node of nodes) {
      const parent = getParent(node.name)
      if (parent) {
        if (!childrenOf.has(parent)) childrenOf.set(parent, [])
        childrenOf.get(parent)!.push(node)
      } else {
        roots.push(node)
      }
    }

    // Sort roots by earliest original index of any member in their group
    function groupFirstIndex(name: string): number {
      let min = originalIndex.get(name) ?? Infinity
      const kids = childrenOf.get(name)
      if (kids) {
        for (const kid of kids) {
          const idx = originalIndex.get(kid.name) ?? Infinity
          if (idx < min) min = idx
          // Recurse for multi-level
          const nested = groupFirstIndex(kid.name)
          if (nested < min) min = nested
        }
      }
      return min
    }

    roots.sort((a, b) => groupFirstIndex(a.name) - groupFirstIndex(b.name))

    // Emit: parent first, then children (depth-first)
    const result: NodeState[] = []
    function emit(node: NodeState) {
      result.push(node)
      const kids = childrenOf.get(node.name)
      if (kids) {
        for (const kid of kids) emit(kid)
      }
    }
    for (const root of roots) emit(root)

    return result
  })
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
    {#each displayNodes as node}
      {@const depth = getDepth(node.name)}
      <div
        class="node"
        class:running={node.status === 'running'}
        class:done={node.status === 'done'}
        class:error={node.status === 'error'}
        class:selected={selectedNode === node.name}
        class:nested={depth > 0}
        style:padding-left="{4 + depth * 16}px"
        onclick={() => onSelectNode?.(selectedNode === node.name ? null : node.name)}
        role="button"
        tabindex="0"
      >
        <span class="status-dot" class:status-pending={node.status === 'pending'} class:status-running={node.status === 'running'} class:status-done={node.status === 'done'} class:status-error={node.status === 'error'} class:cached={node.fullyCached}></span>
        <span class="name">{displayName(node.name)}</span>
        {#if node.status === 'running' && node.itemTotal}
          <span class="item-progress">{node.itemCompleted} / {node.itemTotal}</span>
        {/if}
        <span class="spacer"></span>
        {#if outputExists[node.name]}
          <button class="open-output" title={`Open output directory: ${node.name}`} onclick={(e) => { e.stopPropagation(); window.api.openNodeOutput(node.name) }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 3.5C1.5 2.95 1.95 2.5 2.5 2.5H6L7.5 4H13.5C14.05 4 14.5 4.45 14.5 5V12.5C14.5 13.05 14.05 13.5 13.5 13.5H2.5C1.95 13.5 1.5 13.05 1.5 12.5V3.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
            </svg>
          </button>
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
    color: var(--ev-c-text-3, #666);
    padding: 20px;
    text-align: center;
  }

  .node {
    display: flex;
    align-items: center;
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

  /* ── Status dot ── */

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .status-dot.status-pending {
    background: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    opacity: 0.4;
  }

  .status-dot.status-running {
    background: #f0c040;
    box-shadow: 0 0 6px rgba(240, 192, 64, 0.4);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .status-dot.status-done {
    background: #4caf50;
  }

  .status-dot.status-error {
    background: #f44336;
  }

  .status-dot.cached {
    background: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    opacity: 0.3;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ── Name ── */

  .name {
    color: var(--ev-c-text-1, rgba(255, 255, 245, 0.86));
    user-select: text;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nested .name {
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
    font-size: 12px;
  }

  .running .name {
    color: #f0c040;
  }

  .item-progress {
    color: #f0c040;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  /* ── Right-aligned items ── */

  .spacer {
    flex: 1;
  }

  .open-output {
    display: flex;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 2px;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    opacity: 0.5;
    transition: opacity 0.15s, color 0.15s;
    flex-shrink: 0;
  }

  .open-output:hover {
    opacity: 1;
    color: var(--ev-c-text-1, rgba(255, 255, 245, 0.86));
  }

  .duration {
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    flex-shrink: 0;
  }

  .error-msg {
    color: #f44336;
    font-size: 12px;
  }
</style>
