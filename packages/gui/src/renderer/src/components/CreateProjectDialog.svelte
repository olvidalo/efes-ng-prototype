<script lang="ts">
  import { onMount } from 'svelte'

  interface Question {
    id: string
    label: string
    type: 'text' | 'select' | 'confirm'
    placeholder?: string
    defaultValue?: string | boolean
    options?: { value: string; label: string }[]
    condition?: string[]  // [field, value] — show only when field equals value
    validate?: boolean    // has server-side validation
  }

  interface Props {
    onClose: () => void
    onCreate: (outputDir: string, answers: Record<string, string>) => void
  }

  let { onClose, onCreate }: Props = $props()
  let questions = $state<Question[]>([])
  let answers = $state<Record<string, string>>({})
  let outputDir = $state('')
  let errors = $state<Record<string, string>>({})
  let creating = $state(false)
  let statusMessage = $state('')
  let overlayEl: HTMLDivElement

  onMount(() => { overlayEl?.focus() })

  // Load questions from main process
  $effect(() => {
    window.api.getScaffoldQuestions().then((q: Question[]) => {
      questions = q
      // Set defaults
      for (const question of q) {
        if (question.defaultValue !== undefined) {
          answers[question.id] = String(question.defaultValue)
        }
      }
      // Focus first input after render
      requestAnimationFrame(() => {
        overlayEl?.querySelector<HTMLInputElement>('input, select')?.focus()
      })
    })
  })

  function isVisible(question: Question): boolean {
    if (!question.condition) return true
    const [field, value] = question.condition
    return answers[field] === value
  }

  // Recompute dynamic defaults (e.g., slug from project name).
  // Track which fields the user has manually edited so we don't overwrite them.
  let manuallyEdited = new Set<string>()

  $effect(() => {
    // Trigger on any answer change by reading the whole object
    const snapshot = { ...answers }
    window.api.computeScaffoldDefaults(snapshot).then((defaults: Record<string, string>) => {
      for (const [key, value] of Object.entries(defaults)) {
        if (!manuallyEdited.has(key)) {
          answers[key] = value
        }
      }
    })
  })

  async function handleBrowse() {
    const dir = await window.api.showDirectoryPicker()
    if (dir) outputDir = dir
  }

  async function handleCreate() {
    // Validate
    try {
      const result = await window.api.validateScaffoldAnswers({ ...answers })
      if (result.errors) {
        errors = result.errors
        return
      }
    } catch (err: any) {
      console.error('Validation failed:', err)
      errors = { _general: `Validation error: ${err.message}` }
      return
    }
    errors = {}

    if (!outputDir) {
      errors = { _outputDir: 'Please select a location' }
      return
    }

    creating = true
    statusMessage = 'Creating project...'
    try {
      await onCreate(outputDir, { ...answers })
    } catch (err: any) {
      console.error('Create project failed:', err)
      statusMessage = ''
      errors = { _general: err.message }
      creating = false
    }
  }
</script>

<div class="overlay" bind:this={overlayEl} onkeydown={(e) => { if (e.key === 'Escape' && !creating) onClose() }} role="dialog" tabindex="-1">
  <div class="dialog">
    <h2>New Project</h2>

    {#each questions as question}
      {#if isVisible(question)}
        <div class="field">
          <label for={question.id}>{question.label}</label>
          {#if question.type === 'text'}
            <input
              id={question.id}
              type="text"
              placeholder={question.placeholder ?? ''}
              bind:value={answers[question.id]}
              oninput={() => { manuallyEdited.add(question.id) }}
              class:error={errors[question.id]}
              disabled={creating}
            />
          {:else if question.type === 'select'}
            <select
              id={question.id}
              bind:value={answers[question.id]}
              disabled={creating}
            >
              {#each question.options ?? [] as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          {:else if question.type === 'confirm'}
            <label class="checkbox-label">
              <input
                type="checkbox"
                checked={answers[question.id] === 'true'}
                onchange={(e) => { answers[question.id] = String(e.currentTarget.checked) }}
                disabled={creating}
              />
              Yes
            </label>
          {/if}
          {#if errors[question.id]}
            <span class="field-error">{errors[question.id]}</span>
          {/if}
        </div>
      {/if}
    {/each}

    <div class="field">
      <label for="outputDir">Location</label>
      <div class="browse-row">
        <input
          id="outputDir"
          type="text"
          bind:value={outputDir}
          placeholder="Select a folder..."
          class:error={errors._outputDir}
          disabled={creating}
          readonly
        />
        <button class="browse-btn" onclick={handleBrowse} disabled={creating}>Browse</button>
      </div>
      {#if errors._outputDir}
        <span class="field-error">{errors._outputDir}</span>
      {/if}
    </div>

    {#if errors._general}
      <div class="general-error">{errors._general}</div>
    {/if}

    {#if statusMessage}
      <div class="status">{statusMessage}</div>
    {/if}

    <div class="actions">
      <button class="cancel-btn" onclick={onClose} disabled={creating}>Cancel</button>
      <button class="create-btn" onclick={handleCreate} disabled={creating}>
        {creating ? 'Creating...' : 'Create Project'}
      </button>
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
    max-height: 80vh;
    overflow-y: auto;
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

  input[type="text"], select {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
    font-size: 13px;
  }

  input[type="text"]:focus, select:focus {
    outline: none;
    border-color: var(--ev-c-accent);
  }

  input.error, select.error {
    border-color: var(--ev-c-red);
  }

  .checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 400;
    cursor: pointer;
  }

  .browse-row {
    display: flex;
    gap: 8px;
  }

  .browse-row input {
    flex: 1;
  }

  .browse-btn {
    padding: 6px 14px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background-mute);
    color: var(--color-text);
    font-size: 13px;
    cursor: pointer;
  }

  .browse-btn:hover:not(:disabled) {
    background: var(--color-hover-bg);
  }

  .field-error {
    display: block;
    color: var(--ev-c-red);
    font-size: 12px;
    margin-top: 3px;
  }

  .general-error {
    background: rgba(220, 50, 50, 0.1);
    color: var(--ev-c-red);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .status {
    color: var(--color-text-3);
    font-size: 13px;
    margin-bottom: 12px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }

  .cancel-btn, .create-btn {
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

  .create-btn {
    border: none;
    background: var(--ev-c-accent);
    color: white;
    font-weight: 500;
  }

  .create-btn:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .cancel-btn:disabled, .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
