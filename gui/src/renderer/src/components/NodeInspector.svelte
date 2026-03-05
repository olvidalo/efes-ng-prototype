<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  interface NodeInfo {
    outputKeys: string[]
    outputs: Record<string, string[]>
    dependencies: string[]
    outputDir: string
    nodeType: string
    description: string | null
    cacheStats: { hits: number; total: number } | null
    config: Record<string, any>
  }

  interface Props {
    nodeName: string
    info: NodeInfo | null
    onClose: () => void
    onSelectNode?: (name: string) => void
  }

  let { nodeName, info, onClose, onSelectNode }: Props = $props()

  const FILE_PREVIEW_LIMIT = 10
  const MIN_WIDTH = 220
  const MAX_WIDTH = 600

  let collapsed: Record<string, boolean> = $state({})
  let expandedKeys: Record<string, boolean> = $state({})
  let expandedValues: Record<string, boolean> = $state({})
  let panelWidth = $state(320)

  // ── Drag resize ──

  let dragging = $state(false)
  let dragStartX = 0
  let dragStartWidth = 0

  function onResizeStart(e: MouseEvent) {
    e.preventDefault()
    dragging = true
    dragStartX = e.clientX
    dragStartWidth = panelWidth
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
  }

  function onResizeMove(e: MouseEvent) {
    const delta = dragStartX - e.clientX
    panelWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth + delta))
  }

  function onResizeEnd() {
    dragging = false
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  }

  onDestroy(() => {
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  })

  // ── Section collapse ──

  function toggle(section: string) {
    collapsed[section] = !collapsed[section]
  }

  function isOpen(section: string): boolean {
    return !collapsed[section]
  }

  function toggleKey(key: string) {
    collapsed[`key:${key}`] = !collapsed[`key:${key}`]
  }

  function isKeyOpen(key: string): boolean {
    return !collapsed[`key:${key}`]
  }

  function toggleShowAll(key: string) {
    expandedKeys[key] = !expandedKeys[key]
  }

  function visibleFiles(key: string, paths: string[]): string[] {
    if (expandedKeys[key] || paths.length <= FILE_PREVIEW_LIMIT) return paths
    return paths.slice(0, FILE_PREVIEW_LIMIT)
  }

  function fileCount(paths: string[]): string {
    return paths.length === 1 ? '1 file' : `${paths.length} files`
  }

  function formatConfigValue(value: any): string {
    if (value === null || value === undefined) return '\u2014'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }
</script>

<aside class="inspector" class:dragging style:width="{panelWidth}px" style:min-width="{panelWidth}px" aria-label="Node inspector">
  <div class="resize-handle" onmousedown={onResizeStart}></div>
  <div class="inspector-content">
    <header>
      <div class="header-top">
        <h2 class="node-name">{nodeName}</h2>
        <button class="close-btn" onclick={onClose} title="Close inspector" aria-label="Close">&times;</button>
      </div>
      {#if info}
        <div class="meta-row">
          <span class="type-badge">{info.nodeType}</span>
          {#if info.cacheStats}
            <span class="cache-stat">
              {info.cacheStats.hits}/{info.cacheStats.total} cached
            </span>
          {/if}
        </div>
        {#if info.description}
          <p class="description">{info.description}</p>
        {/if}
      {/if}
    </header>

    {#if !info}
      <div class="loading">
        <div class="loading-line"></div>
        <div class="loading-line short"></div>
        <div class="loading-line"></div>
      </div>
    {:else}
      <div class="sections">
        <!-- Output Keys -->
        <section>
          <button class="section-header" onclick={() => toggle('outputs')}>
            <span class="disclosure" class:open={isOpen('outputs')}></span>
            <span class="section-title">Outputs</span>
            <span class="section-count">{info.outputKeys.length}</span>
          </button>
          {#if isOpen('outputs')}
            <div class="section-body output-keys-body">
              {#each info.outputKeys as key}
                <div class="output-key-group">
                  <button class="output-key-header" onclick={() => toggleKey(key)}>
                    <span class="disclosure small" class:open={isKeyOpen(key)}></span>
                    <span class="output-key-name">{key}</span>
                    {#if info.outputs[key]}
                      <span class="file-count">{fileCount(info.outputs[key])}</span>
                    {:else}
                      <span class="no-output">no output yet</span>
                    {/if}
                  </button>
                  {#if isKeyOpen(key)}
                    {#if info.outputs[key] && info.outputs[key].length > 0}
                      <ul class="file-list">
                        {#each visibleFiles(key, info.outputs[key]) as filePath, i}
                          {@const expandId = `file:${key}:${i}`}
                          <li
                            class="file-entry expandable"
                            class:expanded={expandedValues[expandId]}
                            title={filePath}
                            onclick={() => expandedValues[expandId] = !expandedValues[expandId]}
                          >{filePath}</li>
                        {/each}
                      </ul>
                      {#if info.outputs[key].length > FILE_PREVIEW_LIMIT}
                        <button class="show-all-btn" onclick={() => toggleShowAll(key)}>
                          {expandedKeys[key] ? 'show less' : `show all ${info.outputs[key].length} files`}
                        </button>
                      {/if}
                    {/if}
                  {/if}
                </div>
              {/each}
              {#if info.outputKeys.length === 0}
                <span class="no-output">no output keys declared</span>
              {/if}
            </div>
          {/if}
        </section>

        <!-- Output Directory -->
        <section>
          <div class="output-dir-row">
            <span class="output-dir-label">Output dir</span>
            <span
              class="output-dir-path expandable"
              class:expanded={expandedValues['outputDir']}
              title={info.outputDir}
              onclick={() => expandedValues['outputDir'] = !expandedValues['outputDir']}
            >{info.outputDir}</span>
          </div>
        </section>

        <!-- Dependencies -->
        {#if info.dependencies.length > 0}
          <section>
            <button class="section-header" onclick={() => toggle('deps')}>
              <span class="disclosure" class:open={isOpen('deps')}></span>
              <span class="section-title">Dependencies</span>
              <span class="section-count">{info.dependencies.length}</span>
            </button>
            {#if isOpen('deps')}
              <div class="section-body">
                <ul class="dep-list">
                  {#each info.dependencies as dep}
                    <li>
                      {#if onSelectNode}
                        <button class="dep-link" onclick={() => onSelectNode?.(dep)}>{dep}</button>
                      {:else}
                        <span class="dep-name">{dep}</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </section>
        {/if}

        <!-- Configuration -->
        {#if Object.keys(info.config).length > 0}
          <section>
            <button class="section-header" onclick={() => toggle('config')}>
              <span class="disclosure" class:open={isOpen('config')}></span>
              <span class="section-title">Configuration</span>
            </button>
            {#if isOpen('config')}
              <div class="section-body">
                <dl class="config-table">
                  {#each Object.entries(info.config) as [key, value]}
                    <div class="config-row">
                      <dt>{key}</dt>
                      <dd
                        class="expandable"
                        class:expanded={expandedValues[`cfg:${key}`]}
                        title={formatConfigValue(value)}
                        onclick={() => expandedValues[`cfg:${key}`] = !expandedValues[`cfg:${key}`]}
                      >{formatConfigValue(value)}</dd>
                    </div>
                  {/each}
                </dl>
              </div>
            {/if}
          </section>
        {/if}
      </div>
    {/if}
  </div>
</aside>

<style>
  .inspector {
    height: 100%;
    border-left: 1px solid var(--color-border, #333);
    background: var(--color-background-soft, #222);
    display: flex;
    flex-direction: row;
    overflow: hidden;
    animation: slide-in 0.18s ease-out;
    position: relative;
  }

  .inspector.dragging {
    user-select: none;
  }

  .inspector-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Resize handle ── */

  .resize-handle {
    width: 5px;
    cursor: col-resize;
    flex-shrink: 0;
    position: relative;
  }

  .resize-handle::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: background 0.15s;
  }

  .resize-handle:hover::after,
  .dragging .resize-handle::after {
    background: rgba(59, 130, 246, 0.3);
  }

  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* ── Header ── */

  header {
    padding: 14px 14px 12px;
    border-bottom: 1px solid var(--color-border, #333);
    flex-shrink: 0;
  }

  .header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .node-name {
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--ev-c-text-1, rgba(255, 255, 245, 0.86));
    line-height: 1.3;
    word-break: break-all;
  }

  .close-btn {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    font-size: 18px;
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
    line-height: 1;
    padding: 0;
  }

  .close-btn:hover {
    color: var(--ev-c-text-1, rgba(255, 255, 245, 0.86));
    background: var(--color-background-mute, #282828);
    border-color: var(--color-border, #333);
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  .type-badge {
    font-size: 11px;
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
    padding: 2px 7px;
    border-radius: 3px;
    background: rgba(59, 130, 246, 0.12);
    color: #6b9eff;
    border: 1px solid rgba(59, 130, 246, 0.18);
    letter-spacing: 0.01em;
  }

  .cache-stat {
    font-size: 11px;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    font-variant-numeric: tabular-nums;
  }

  .description {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
  }

  /* ── Sections ── */

  .sections {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  section {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 9px 14px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
    transition: background 0.1s;
  }

  .section-header:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .disclosure {
    display: inline-block;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 4px 0 4px 6px;
    border-color: transparent transparent transparent var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    transition: transform 0.12s ease;
    flex-shrink: 0;
  }

  .disclosure.open {
    transform: rotate(90deg);
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .section-count {
    font-size: 10px;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }

  .section-body {
    padding: 0 14px 10px 26px;
  }

  /* ── Output keys ── */

  .output-keys-body {
    padding-left: 14px;
  }

  .output-key-group {
    margin-bottom: 2px;
  }

  .output-key-group:last-child {
    margin-bottom: 0;
  }

  .output-key-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
    width: 100%;
    padding: 3px 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
    transition: color 0.1s;
  }

  .output-key-header:hover {
    color: var(--ev-c-text-1, rgba(255, 255, 245, 0.86));
  }

  .disclosure.small {
    border-width: 3px 0 3px 5px;
  }

  .output-key-name {
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    color: #6b9eff;
    font-weight: 500;
  }

  .file-count {
    font-size: 10px;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    font-variant-numeric: tabular-nums;
    margin-left: auto;
  }

  .file-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0 11px;
  }

  .file-entry {
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 11px;
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
    padding: 1.5px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.1s;
  }

  .file-entry:hover {
    color: var(--ev-c-text-1, rgba(255, 255, 245, 0.86));
  }

  .show-all-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 11px;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    padding: 3px 0 3px 11px;
    transition: color 0.1s;
  }

  .show-all-btn:hover {
    color: #6b9eff;
  }

  .no-output {
    font-size: 11px;
    font-style: italic;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
  }

  /* ── Output directory ── */

  .output-dir-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 14px;
  }

  .output-dir-label {
    font-size: 11px;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    flex-shrink: 0;
  }

  .output-dir-path {
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 11px;
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Dependencies ── */

  .dep-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dep-link {
    font-size: 12px;
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
    background: none;
    border: none;
    padding: 2px 0;
    cursor: pointer;
    text-align: left;
    text-decoration: none;
    transition: color 0.1s;
  }

  .dep-link:hover {
    color: #6b9eff;
  }

  .dep-name {
    font-size: 12px;
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
  }

  /* ── Configuration ── */

  .config-table {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .config-row {
    display: flex;
    gap: 8px;
    padding: 3px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
  }

  .config-row:last-child {
    border-bottom: none;
  }

  .config-row dt {
    font-size: 11px;
    color: var(--ev-c-text-3, rgba(235, 235, 245, 0.38));
    flex-shrink: 0;
    min-width: 80px;
  }

  .config-row dd {
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 11px;
    color: var(--ev-c-text-2, rgba(235, 235, 245, 0.6));
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .config-row dd:hover {
    color: var(--ev-c-text-1, rgba(255, 255, 245, 0.86));
  }

  /* ── Click-to-expand ── */

  .expandable {
    cursor: pointer;
    transition: color 0.1s;
  }

  .expandable:hover {
    color: var(--ev-c-text-1, rgba(255, 255, 245, 0.86));
  }

  .expandable.expanded {
    white-space: normal;
    word-break: break-all;
    overflow: visible;
    text-overflow: unset;
  }

  /* ── Loading state ── */

  .loading {
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .loading-line {
    height: 10px;
    border-radius: 3px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.06) 50%,
      rgba(255, 255, 255, 0.03) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }

  .loading-line.short {
    width: 60%;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
