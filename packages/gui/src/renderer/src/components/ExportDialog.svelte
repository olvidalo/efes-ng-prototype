<script lang="ts">
  import { FolderOpen } from 'lucide-svelte'

  interface Props {
    projectSlug: string
    onClose: () => void
  }

  let { projectSlug, onClose }: Props = $props()
  let parentDir = $state('')
  let folderName = $state(projectSlug + '-export')
  let pathPrefix = $state('/')
  let exporting = $state(false)
  let status = $state('')
  let error = $state('')
  let done = $state(false)

  let fullPath = $derived(parentDir && folderName ? parentDir + '/' + folderName : '')

  async function handleBrowse() {
    const dir = await window.api.showDirectoryPicker()
    if (dir) parentDir = dir
  }

  async function handleExport() {
    if (!parentDir) {
      error = 'Please select a parent folder.'
      return
    }
    if (!folderName.trim()) {
      error = 'Please enter a folder name.'
      return
    }
    error = ''
    exporting = true
    status = 'Building site...'
    try {
      const result = await window.api.exportProject(fullPath, pathPrefix)
      status = `Exported ${result.fileCount} files.`
      done = true
    } catch (err: any) {
      error = err.message
      status = ''
    } finally {
      exporting = false
    }
  }
</script>

<div class="overlay" role="dialog" tabindex="-1" onkeydown={(e) => { if (e.key === 'Escape' && !exporting) onClose() }}>
  <div class="dialog">
    <h2>Export Site</h2>

    <div class="field">
      <label for="parentDir">Save in</label>
      <div class="browse-row">
        <input
          id="parentDir"
          type="text"
          bind:value={parentDir}
          placeholder="Select a folder..."
          disabled={exporting || done}
          readonly
        />
        <button class="browse-btn" onclick={handleBrowse} disabled={exporting || done}>
          <FolderOpen size={14} />
          Browse
        </button>
      </div>
    </div>

    <div class="field">
      <label for="folderName">Folder name</label>
      <input
        id="folderName"
        type="text"
        bind:value={folderName}
        placeholder="my-site-export"
        disabled={exporting || done}
      />
    </div>

    {#if fullPath}
      <div class="path-preview">
        <code>{fullPath}/</code>
      </div>
    {/if}

    <div class="field">
      <label for="pathPrefix">Path prefix</label>
      <input
        id="pathPrefix"
        type="text"
        bind:value={pathPrefix}
        placeholder="/"
        disabled={exporting || done}
      />
      <p class="hint">
        If deploying to a subdirectory (e.g. example.com/my-project/), enter the path like <code>/my-project/</code>. For root deployment, leave as <code>/</code>.
      </p>
    </div>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    {#if status}
      <div class="status" class:success={done}>{status}</div>
    {/if}

    <div class="actions">
      <button class="cancel-btn" onclick={onClose} disabled={exporting}>
        {done ? 'Close' : 'Cancel'}
      </button>
      {#if !done}
        <button class="export-btn" onclick={handleExport} disabled={exporting || !fullPath}>
          {exporting ? 'Exporting...' : 'Export'}
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 24px;
    width: 480px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  h2 {
    margin: 0 0 20px;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
  }

  .field {
    margin-bottom: 16px;
  }

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-2);
    margin-bottom: 4px;
  }

  input[type="text"] {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
    font-size: 13px;
  }

  input[type="text"]:focus {
    outline: none;
    border-color: var(--ev-c-accent);
  }

  .browse-row {
    display: flex;
    gap: 8px;
  }

  .browse-row input { flex: 1; }

  .browse-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background-mute);
    color: var(--color-text);
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }

  .browse-btn:hover:not(:disabled) { background: var(--color-hover-bg); }

  .path-preview {
    margin: -8px 0 16px;
    padding: 8px 10px;
    background: var(--color-background-mute);
    border-radius: 4px;
    font-size: 12px;
  }

  .path-preview code {
    color: var(--color-text);
  }

  .hint {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--color-text-3);
    line-height: 1.4;
  }

  .hint code {
    background: var(--color-background-mute);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 11px;
  }

  .error {
    background: rgba(220, 50, 50, 0.1);
    color: var(--ev-c-red);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 12px;
  }

  .status {
    color: var(--color-text-3);
    font-size: 13px;
    margin-bottom: 12px;
  }

  .status.success {
    color: var(--ev-c-green, #4caf50);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }

  .cancel-btn, .export-btn {
    padding: 7px 18px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
  }

  .cancel-btn {
    border: 1px solid var(--color-border);
    background: var(--color-background-mute);
    color: var(--color-text);
  }

  .export-btn {
    border: none;
    background: var(--ev-c-accent);
    color: white;
    font-weight: 500;
  }

  .export-btn:hover:not(:disabled) { filter: brightness(1.1); }
  .cancel-btn:disabled, .export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .browse-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
