<script lang="ts">
  import { ChevronRight, FolderOpen } from 'lucide-svelte'

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
  let collapsed: Record<string, boolean> = $state({})

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

  // Initialize collapsed state for composite nodes (collapsed by default)
  $effect(() => {
    for (const node of nodes) {
      if (hasChildren(node.name) && !(node.name in collapsed)) {
        collapsed[node.name] = true
      }
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

  /** Check if a node has children */
  function hasChildren(name: string): boolean {
    for (const n of nodes) {
      if (getParent(n.name) === name) return true
    }
    return false
  }

  /** Get all descendants of a node (recursive) */
  function getDescendants(name: string): NodeState[] {
    const result: NodeState[] = []
    for (const n of nodes) {
      if (n.name !== name && n.name.startsWith(name + ':') && getParent(n.name) !== null) {
        // Verify it's actually a descendant by walking up
        let current = n.name
        while (current) {
          const parent = getParent(current)
          if (parent === name) { result.push(n); break }
          if (!parent) break
          current = parent
        }
      }
    }
    return result
  }

  /**
   * Summary for a collapsed composite node — picks the most relevant child status:
   * - If any child is running: show that child's progress/status
   * - If any child errored: show the error
   * - If all done: show combined duration
   * - Otherwise: pending
   */
  function getChildSummary(name: string): {
    status: NodeState['status']
    error?: string
    itemCompleted?: number
    itemTotal?: number
    durationMs?: number
    activeChildName?: string
  } | null {
    if (!collapsed[name]) return null
    const descendants = getDescendants(name)
    if (descendants.length === 0) return null

    // Running child takes priority
    const running = descendants.find(d => d.status === 'running')
    if (running) {
      return {
        status: 'running',
        itemCompleted: running.itemCompleted,
        itemTotal: running.itemTotal,
        activeChildName: displayName(running.name)
      }
    }

    // Error takes next priority
    const errored = descendants.find(d => d.status === 'error')
    if (errored) {
      return {
        status: 'error',
        error: errored.error,
        activeChildName: displayName(errored.name)
      }
    }

    // All done — sum durations
    const allDone = descendants.every(d => d.status === 'done')
    if (allDone) {
      const totalMs = descendants.reduce((sum, d) => sum + (d.durationMs ?? 0), 0)
      return { status: 'done', durationMs: totalMs }
    }

    return { status: 'pending' }
  }

  /** Check if a node or any ancestor is collapsed */
  function isHidden(name: string): boolean {
    let current = name
    while (true) {
      const parent = getParent(current)
      if (!parent) return false
      if (collapsed[parent]) return true
      current = parent
    }
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

  function toggleCollapse(name: string, e: Event) {
    e.stopPropagation()
    collapsed[name] = !collapsed[name]
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
      {@const isComposite = hasChildren(node.name)}
      {#if !isHidden(node.name)}
        {@const summary = isComposite ? getChildSummary(node.name) : null}
        {@const effectiveStatus = summary?.status ?? node.status}
        <div
          class="node"
          class:running={effectiveStatus === 'running'}
          class:done={effectiveStatus === 'done'}
          class:error={effectiveStatus === 'error'}
          class:selected={selectedNode === node.name}
          class:nested={depth > 0}
          class:composite={isComposite}
          style:padding-left="{4 + depth * 16}px"
          onclick={() => onSelectNode?.(selectedNode === node.name ? null : node.name)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectNode?.(selectedNode === node.name ? null : node.name) }}}
          role="button"
          tabindex="0"
        >
          {#if isComposite}
            <button
              class="collapse-toggle"
              class:expanded={!collapsed[node.name]}
              onclick={(e) => toggleCollapse(node.name, e)}
              title={collapsed[node.name] ? 'Expand' : 'Collapse'}
            >
              <ChevronRight size={14} />
            </button>
          {:else}
            <span class="toggle-spacer"></span>
          {/if}
          <span class="status-dot" class:status-pending={effectiveStatus === 'pending'} class:status-running={effectiveStatus === 'running'} class:status-done={effectiveStatus === 'done'} class:status-error={effectiveStatus === 'error'} class:cached={node.fullyCached && !summary}></span>
          <span class="name">{displayName(node.name)}</span>
          {#if summary?.status === 'running' && summary.activeChildName}
            <span class="child-label">{summary.activeChildName}</span>
          {/if}
          {#if summary?.status === 'running' && summary.itemTotal}
            <span class="item-progress">{summary.itemCompleted} / {summary.itemTotal}</span>
          {:else if node.status === 'running' && node.itemTotal}
            <span class="item-progress">{node.itemCompleted} / {node.itemTotal}</span>
          {/if}
          <span class="spacer"></span>
          {#if outputExists[node.name]}
            <button class="open-output" title={`Open output directory: ${node.name}`} onclick={(e) => { e.stopPropagation(); window.api.openNodeOutput(node.name) }}>
              <FolderOpen size={14} />
            </button>
          {/if}
          {#if summary?.durationMs !== undefined}
            <span class="duration">{(summary.durationMs / 1000).toFixed(2)}s</span>
          {:else if node.durationMs !== undefined}
            <span class="duration">{(node.durationMs / 1000).toFixed(2)}s</span>
          {/if}
        </div>
        {#if summary?.error}
          <div class="error-msg" style:padding-left="{4 + depth * 16 + 35}px">{summary.error}</div>
        {:else if node.error}
          <div class="error-msg" style:padding-left="{4 + depth * 16 + 35}px">{node.error}</div>
        {/if}
      {/if}
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
    background: var(--color-background-mute);
    border-radius: 2px;
    margin-bottom: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--ev-c-accent);
    transition: width 0.2s ease;
  }

  .empty {
    color: var(--color-text-3);
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
    background: var(--color-hover-bg);
  }

  .node.selected {
    background: var(--ev-c-accent-selection);
  }

  /* ── Collapse toggle ── */

  .collapse-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    margin: 0 -2px;
    background: none;
    border: none;
    border-radius: 3px;
    color: var(--color-text-3);
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.1s, transform 0.15s ease;
    transform: rotate(0deg);
  }

  .collapse-toggle.expanded {
    transform: rotate(90deg);
  }

  .collapse-toggle:hover {
    color: var(--color-text);
    background: var(--color-background-mute);
  }

  .toggle-spacer {
    width: 18px;
    flex-shrink: 0;
    margin: 0 -2px;
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
    background: var(--color-text-3);
    opacity: 0.4;
  }

  .status-dot.status-running {
    background: var(--ev-c-yellow);
    box-shadow: 0 0 6px var(--ev-c-yellow-glow);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .status-dot.status-done {
    background: var(--ev-c-green);
  }

  .status-dot.status-error {
    background: var(--ev-c-red);
  }

  .status-dot.cached {
    background: var(--color-text-3);
    opacity: 0.3;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ── Name ── */

  .name {
    color: var(--color-text);
    user-select: text;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nested .name {
    color: var(--color-text-2);
    font-size: 12px;
  }

  .composite .name {
    font-weight: 500;
  }

  .running .name {
    color: var(--ev-c-yellow);
  }

  .child-label {
    color: var(--color-text-3);
    font-size: 11px;
    font-style: italic;
  }

  .running .child-label {
    color: var(--ev-c-yellow);
    opacity: 0.7;
  }

  .item-progress {
    color: var(--ev-c-yellow);
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
    color: var(--color-text-3);
    opacity: 0.5;
    transition: opacity 0.15s, color 0.15s;
    flex-shrink: 0;
  }

  .open-output:hover {
    opacity: 1;
    color: var(--color-text);
  }

  .duration {
    color: var(--color-text-3);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    flex-shrink: 0;
  }

  .error-msg {
    color: var(--ev-c-red);
    font-size: 12px;
    padding-right: 4px;
    margin-top: -2px;
    margin-bottom: 2px;
    line-height: 1.4;
  }
</style>
