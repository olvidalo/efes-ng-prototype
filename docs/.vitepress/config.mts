import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { createRequire } from 'node:module'
import { transformerNotationMap, transformerNotationWordHighlight, transformerMetaWordHighlight } from '@shikijs/transformers';

const require = createRequire(import.meta.url)
const pkg = require('../../package.json') as { version: string }
const commitSha = (process.env.GITHUB_SHA ?? 'local').slice(0, 7)

const xmlRemoveDiffTransformer = transformerNotationMap({
  classMap: {
    'rm': 'diff remove'
  },
  classActivePre: 'has-diff',
  matchAlgorithm: 'v3',
});

export default withMermaid(
  defineConfig({
    title: 'EFES-NG Prototype',
    description: 'A modern pipeline-based framework for publishing EpiDoc/TEI XML as static websites',
    base: process.env.DOCS_BASE || '/',
    lastUpdated: true,
    themeConfig: {
      search: { provider: 'local', options: { detailedView: true } },
      outline: { level: [2, 3] },
      nav: [
        { text: 'Guide', link: '/' },
        { text: 'Tutorial', link: '/tutorial/' },
        { text: 'Reference', link: '/reference/pipeline-xml' },
        { text: `v${pkg.version}`, link: 'https://github.com/olvidalo/efes-ng-prototype/releases' },
      ],

      lastUpdated: {
        text: 'Last updated',
        formatOptions: { dateStyle: 'medium', timeStyle: 'short' },
      },

      footer: {
        message: `v${pkg.version} · <code>${commitSha}</code> · Documentation under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>`,
        copyright: 'Copyright (c) 2025-2026 CNRS / UMR 8167 Orient et Mediterranee · Author: Marcel Schaeben',
      },

      sidebar: {
        '/tutorial/': [
          {
            text: 'Tutorial',
            items: [
              { text: 'Overview', link: '/tutorial/' },
              { text: 'Creating a Project', link: '/tutorial/create-project' },
              { text: 'Exploring the Project', link: '/tutorial/explore-project' },
              { text: 'Customizing the Site', link: '/tutorial/customize-site' },
              { text: 'Adding Content', link: '/tutorial/adding-content' },
              { text: 'Metadata and Data Generation', link: '/tutorial/metadata-and-data' },
              { text: 'Customizing the Seal List', link: '/tutorial/customize-seal-list' },
              { text: 'Indices', link: '/tutorial/indices' },
              { text: 'Search', link: '/tutorial/search' },
              { text: 'Multi-Language Support', link: '/tutorial/multi-language' },
              { text: 'Authority Files and Places Index', link: '/tutorial/places-index' },
              { text: 'Bibliography', link: '/tutorial/bibliography' },
              { text: 'Deploying', link: '/tutorial/deploying' },
            ],
          },
        ],
        '/reference/': [
          {
            text: 'Reference',
            items: [
              { text: 'Pipeline XML', link: '/reference/pipeline-xml' },
              { text: 'Node Types', link: '/reference/node-types' },
              { text: 'Input Types', link: '/reference/input-types' },
              { text: 'Library Stylesheets', link: '/reference/library-stylesheets' },
              { text: 'efes-search Component', link: '/reference/efes-search' },
              { text: 'CLI', link: '/reference/cli' },
            ],
          },
        ],
        '/': [
          {
            text: 'Introduction',
            items: [
              { text: 'What is EFES-NG?', link: '/' },
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Example Projects', link: '/guide/example-projects' },
              { text: 'Desktop Application', link: '/guide/gui' },

            ],
          },
          {
            text: 'Tutorial',
            items: [
              { text: 'Build a SigiDoc Edition', link: '/tutorial/' },
            ],
          },
          {
            text: 'Concepts',
            items: [
              { text: 'Pipeline & Nodes', link: '/guide/pipeline-and-nodes' },
              { text: 'Content and Templates', link: '/guide/two-worlds' },
              { text: 'Project Structure', link: '/guide/project-structure' },
              { text: 'Static Site Generation', link: '/guide/static-site-generation' },
              { text: 'Metadata Configuration', link: '/guide/metadata-config' },
              { text: 'Search', link: '/guide/search' },
              { text: 'Multi-Language Architecture', link: '/guide/multi-language-architecture' },
              { text: 'Design Decisions', link: '/guide/design-decisions' },
              { text: 'Designing Sustainable Projects', link: '/guide/designing-sustainable-projects' },
            ],
          },
          {
            text: 'Customization',
            items: [
              { text: 'XSLT Overrides', link: '/guide/xslt-overrides' },
              { text: 'Stylesheets & Theming', link: '/guide/theming' },
            ],
          },
          {
            text: 'Tools',
            items: [
              { text: 'Oxygen XML Editor Project', link: '/guide/oxygen-project' },
            ],
          },
          {
            text: 'Deployment',
            items: [
              { text: 'Publishing Your Site', link: '/guide/deployment' },
            ],
          },
          {
            text: 'Project Status',
            items: [
              { text: 'Limitations and Future Work', link: '/guide/limitations-and-future-work' },
            ],
          },
        ],
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/olvidalo/efes-ng-prototype' },
      ],
    },
    markdown: {
      codeTransformers: [
        xmlRemoveDiffTransformer,
        transformerNotationWordHighlight(),
        transformerMetaWordHighlight()
      ],
      languageAlias: {
        "njk": "jinja"
      }
    }
  }),
)
