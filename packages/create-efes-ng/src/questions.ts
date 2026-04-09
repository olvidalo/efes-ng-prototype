/**
 * Scaffold question definitions — shared between CLI and GUI.
 *
 * Each question defines what to ask. The rendering (terminal prompts
 * or dialog inputs) is handled by the consumer.
 */

export interface ScaffoldQuestionBase {
    id: string
    label: string
    condition?: (answers: Record<string, string>) => boolean
}

export interface TextQuestion extends ScaffoldQuestionBase {
    type: 'text'
    placeholder?: string
    defaultValue?: string | ((answers: Record<string, string>) => string)
    validate?: (value: string) => string | undefined
}

export interface ConfirmQuestion extends ScaffoldQuestionBase {
    type: 'confirm'
    defaultValue?: boolean
}

export interface SelectQuestion extends ScaffoldQuestionBase {
    type: 'select'
    options: { value: string; label: string }[]
    defaultValue?: string
}

export type ScaffoldQuestion = TextQuestion | ConfirmQuestion | SelectQuestion

export interface ScaffoldAnswers {
    projectName: string
    projectSlug: string
    initGit: string       // 'true' | 'false'
    stylesheets: string   // 'epidoc' | 'sigidoc' | 'custom' | 'none'
    stylesheetRepo?: string
}

export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

export const STYLESHEET_REPOS: Record<string, { url: string; dir: string }> = {
    epidoc: { url: 'https://github.com/EpiDoc/Stylesheets', dir: 'epidoc' },
    sigidoc: { url: 'https://github.com/SigiDoc/Stylesheets', dir: 'sigidoc' },
}

export const scaffoldQuestions: ScaffoldQuestion[] = [
    {
        id: 'projectName',
        label: 'Project Name',
        type: 'text',
        placeholder: 'Inscriptions of My Collection',
        validate: (v) => v.trim() ? undefined : 'Project name is required',
    },
    {
        id: 'projectSlug',
        label: 'Project Directory',
        type: 'text',
        placeholder: 'my-collection',
        defaultValue: (answers) => slugify(answers.projectName || ''),
        validate: (v) => {
            if (!v.trim()) return 'Directory name is required'
            if (!/^[a-z0-9][a-z0-9-]*$/.test(v)) return 'Use lowercase letters, numbers, and hyphens only'
            return undefined
        },
    },
    {
        id: 'stylesheets',
        label: 'Inscription/seal stylesheets',
        type: 'select',
        options: [
            { value: 'epidoc', label: 'EpiDoc (github.com/EpiDoc/Stylesheets)' },
            { value: 'sigidoc', label: 'SigiDoc (github.com/SigiDoc/Stylesheets)' },
            { value: 'custom', label: 'Custom repository' },
            { value: 'none', label: 'None (add later)' },
        ],
        defaultValue: 'epidoc',
    },
    {
        id: 'stylesheetRepo',
        label: 'Stylesheet repository URL',
        type: 'text',
        placeholder: 'https://github.com/org/stylesheets',
        condition: (answers) => answers.stylesheets === 'custom',
        validate: (v) => {
            if (!v.trim()) return 'Repository URL is required'
            if (!v.startsWith('https://')) return 'URL must start with https://'
            return undefined
        },
    },
    {
        id: 'initGit',
        label: 'Initialize git repository?',
        type: 'confirm',
        defaultValue: true,
    },
]
