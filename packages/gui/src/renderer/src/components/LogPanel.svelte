<script lang="ts">
  import { tick } from 'svelte'
  import { MessageSquareText } from 'lucide-svelte'

  interface LogEntry {
    time: Date
    message: string
  }

  interface NodeMessage {
    nodeName: string
    text: string
    sourceFile: string | null
  }

  interface Props {
    logs: LogEntry[]
    messages: NodeMessage[]
    activeTab?: 'log' | 'messages'
    filterNode?: string | null
    onTabChange?: (tab: 'log' | 'messages') => void
    onFilterClear?: () => void
  }

  let {
    logs,
    messages,
    activeTab = 'log',
    filterNode = null,
    onTabChange,
    onFilterClear
  }: Props = $props()

  let container: HTMLDivElement | undefined = $state()
  let seenLogCount = $state(0)
  let seenMessageCount = $state(0)

  // While viewing a tab, keep its seen count in sync (you're watching the items arrive)
  $effect(() => {
    if (activeTab === 'log') seenLogCount = logs.length
  })
  $effect(() => {
    if (activeTab === 'messages') seenMessageCount = messages.length
  })

  let unseenLogs = $derived(Math.max(0, logs.length - seenLogCount))
  let unseenMessages = $derived(Math.max(0, messages.length - seenMessageCount))

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-GB', { hour12: false })
  }

  // Group messages by node name for display (filtering already done by parent via getMessages)
  let groupedMessages = $derived.by(() => {
    const groups: { nodeName: string, items: { text: string, sourceFile: string | null }[] }[] = []
    const map = new Map<string, { text: string, sourceFile: string | null }[]>()
    for (const msg of messages) {
      let items = map.get(msg.nodeName)
      if (!items) {
        items = []
        map.set(msg.nodeName, items)
        groups.push({ nodeName: msg.nodeName, items })
      }
      items.push({ text: msg.text, sourceFile: msg.sourceFile })
    }
    return groups
  })

  $effect(() => {
    // Auto-scroll when new entries arrive
    const count = activeTab === 'log' ? logs.length : messages.length
    if (count && container) {
      tick().then(() => {
        container!.scrollTop = container!.scrollHeight
      })
    }
  })

  function basename(filepath: string): string {
    return filepath.split('/').pop() ?? filepath
  }
</script>

<div class="log-container">
  <div class="tab-bar">
    <button
      class="tab"
      class:active={activeTab === 'log'}
      onclick={() => onTabChange?.('log')}
    >
      Log
      {#if unseenLogs > 0}
        <span class="tab-badge">{unseenLogs}</span>
      {/if}
    </button>
    <button
      class="tab"
      class:active={activeTab === 'messages'}
      onclick={() => onTabChange?.('messages')}
    >
      <MessageSquareText size={12} />
      Messages
      {#if messages.length > 0}
        <span class="tab-badge" class:stale={unseenMessages === 0}>{messages.length}</span>
      {/if}
    </button>
    {#if activeTab === 'messages' && filterNode}
      <button class="filter-chip" onclick={() => onFilterClear?.()} title="Click to show all messages">
        <span class="filter-prefix">Filter:</span>
        {filterNode}
        <span class="filter-x">&times;</span>
      </button>
    {/if}
  </div>

  <div class="tab-content" bind:this={container}>
    {#if activeTab === 'log'}
      {#each logs as entry}
        <div class="log-entry">
          <span class="time">{formatTime(entry.time)}</span>
          <span class="msg">{entry.message}</span>
        </div>
      {/each}
    {:else}
      {#if messages.length === 0}
        <div class="empty-messages">No messages from this build.</div>
      {:else}
        {#each groupedMessages as group}
          <div class="message-group">
            {#if !filterNode}
              <div class="message-node-header">{group.nodeName}</div>
            {/if}
            {#each group.items as msg}
              <div class="message-entry">
                {#if msg.sourceFile}
                  <span class="message-source">{basename(msg.sourceFile)}</span>
                {/if}
                <span class="message-text">{msg.text}</span>
              </div>
            {/each}
          </div>
        {/each}
      {/if}
    {/if}
  </div>
</div>

<style>
  .log-container {
    display: flex;
    flex-direction: column;
    height: 200px;
    border-top: 1px solid var(--color-border);
    background: var(--color-background);
  }

  /* ── Tabs ── */

  .tab-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 8px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    margin-bottom: -1px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-3);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.1s;
  }

  .tab:hover {
    color: var(--color-text-2);
  }

  .tab.active {
    color: var(--color-text);
    border-bottom-color: var(--ev-c-accent);
  }

  .tab-badge {
    background: var(--ev-c-accent);
    color: var(--color-background);
    font-size: 10px;
    font-weight: 600;
    padding: 0 5px;
    border-radius: 8px;
    line-height: 16px;
    min-width: 16px;
    text-align: center;
  }

  .tab-badge.stale {
    background: var(--color-text-3);
    opacity: 0.5;
  }

  .filter-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    padding: 2px 8px;
    background: var(--color-background-mute);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    font-size: 11px;
    color: var(--color-text-2);
    cursor: pointer;
    transition: background 0.1s;
  }

  .filter-chip:hover {
    background: var(--color-hover-bg);
    color: var(--color-text);
  }

  .filter-prefix {
    color: var(--color-text-3);
  }

  .filter-x {
    color: var(--color-text-3);
    font-size: 13px;
    line-height: 1;
  }

  .filter-chip:hover .filter-x {
    color: var(--color-text);
  }

  /* ── Content ── */

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    font-family: monospace;
    font-size: 12px;
    user-select: text;
  }

  /* ── Log tab ── */

  .log-entry {
    display: flex;
    gap: 10px;
    padding: 1px 0;
  }

  .time {
    color: var(--color-text-3);
    flex-shrink: 0;
  }

  .msg {
    color: var(--color-text-2);
  }

  /* ── Messages tab ── */

  .empty-messages {
    color: var(--color-text-3);
    padding: 12px 0;
  }

  .message-group {
    margin-bottom: 8px;
  }

  .message-group:last-child {
    margin-bottom: 0;
  }

  .message-node-header {
    color: var(--color-text);
    font-weight: 500;
    font-size: 11px;
    padding: 2px 0;
    margin-bottom: 2px;
  }

  .message-entry {
    display: flex;
    gap: 8px;
    padding: 1px 0;
    padding-left: 8px;
  }

  .message-source {
    color: var(--ev-c-accent);
    flex-shrink: 0;
  }

  .message-source::after {
    content: ':';
  }

  .message-text {
    color: var(--color-text-2);
  }
</style>
