import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'EFES-NG Prototype',
    description: 'A modern pipeline-based framework for publishing EpiDoc/TEI XML as static websites',
    themeConfig: {
      search: { provider: 'local', options: { detailedView: true } },
      outline: { level: [2, 3] },
      nav: [
        { text: 'Guide', link: '/' },
        { text: 'Tutorial', link: '/tutorial/' },
        { text: 'Reference', link: '/reference/pipeline-xml' },
      ],

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
              { text: 'Content and Templates', link: '/guide/two-worlds' },
              { text: 'Pipeline & Nodes', link: '/guide/pipeline-and-nodes' },
              { text: 'Project Structure', link: '/guide/project-structure' },
              { text: 'Static Site Generation', link: '/guide/static-site-generation' },
              { text: 'Multi-Language Architecture', link: '/guide/multi-language-architecture' },
              { text: 'Desktop Application', link: '/guide/gui' },
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
        ],
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/EpiDoc/efes-ng' },
      ],
    },
  }),
)
