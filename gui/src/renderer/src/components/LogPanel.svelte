<script lang="ts">
  import { tick } from 'svelte'

  interface LogEntry {
    time: Date
    message: string
  }

  interface Props {
    logs: LogEntry[]
  }

  let { logs }: Props = $props()
  let container: HTMLDivElement | undefined = $state()

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-GB', { hour12: false })
  }

  $effect(() => {
    // Auto-scroll when new logs arrive
    if (logs.length && container) {
      tick().then(() => {
        container!.scrollTop = container!.scrollHeight
      })
    }
  })
</script>

<div class="log-panel" bind:this={container}>
  {#each logs as entry}
    <div class="log-entry">
      <span class="time">{formatTime(entry.time)}</span>
      <span class="msg">{entry.message}</span>
    </div>
  {/each}
</div>

<style>
  .log-panel {
    user-select: text;
    height: 200px;
    overflow-y: auto;
    border-top: 1px solid var(--color-border, #333);
    background: var(--color-background, #111);
    padding: 8px 12px;
    font-family: monospace;
    font-size: 12px;
  }

  .log-entry {
    display: flex;
    gap: 10px;
    padding: 1px 0;
  }

  .time {
    color: var(--color-text-3, #666);
    flex-shrink: 0;
  }

  .msg {
    color: var(--color-text-2, #bbb);
  }
</style>
