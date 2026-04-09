# Stylesheets & Theming

EFES-NG projects use standard CSS for styling. The website template includes a structured CSS setup you can customize.

## CSS Structure

```
source/website/assets/css/
├── base.css        # Typography, layout, navigation
├── epidoc.css      # EpiDoc-specific rendering styles
└── project.css     # Your project-specific customizations
```

- **`base.css`** — core layout, navigation, responsive design
- **`epidoc.css`** — styles for rendered EpiDoc elements (apparatus, editorial marks, etc.)
- **`project.css`** — project-specific colors, branding, additional styles

## Customizing

Edit `project.css` for project-specific styling. This file is loaded last, so it can override any base or EpiDoc styles.

## Eleventy Templates

Page layouts live in `source/website/_includes/layouts/`:

- **`base.njk`** — root layout with HTML head, navigation, footer
- **`document.njk`** — extends base, adds inscription/document-specific layout

Templates use [Nunjucks](https://mozilla.github.io/nunjucks/) syntax. You can add new layouts or modify existing ones.
