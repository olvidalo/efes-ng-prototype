# Creating a Project

The fastest way to start a new EFES-NG Prototype project is with the built-in project generator. It creates a ready-to-build project with all the necessary files and directory structure.

> [!warning] Work in Progress
> The GUI-integrated project generator is not yet available. For now, use the command-line scaffolding tool:
>
> ```bash
> npx create-efes-ng my-sigidoc-project
> ```
>
> The wizard will ask you to:
> 1. Name your project
> 2. Choose a project type (EpiDoc with SigiDoc stylesheets)
> 3. Confirm the stylesheet repository to clone

## What Just Happened?

The generator created a project directory with this structure:

```
my-sigidoc-project/
├── pipeline.xml                    # Pipeline definition
├── source/
│   ├── stylesheets/
│   │   ├── sigidoc/                # SigiDoc stylesheets (cloned)
│   │   ├── lib/                    # Framework-provided XSLT
│   │   │   ├── epidoc-to-html.xsl
│   │   │   ├── extract-metadata.xsl
│   │   │   ├── create-11ty-data.xsl
│   │   │   ├── aggregate-indices.xsl
│   │   │   ├── aggregate-search-data.xsl
│   │   │   └── prune-to-language.xsl
│   │   └── overrides.xsl           # Your project-level overrides
│   ├── authority/                   # Controlled vocabularies (empty)
│   ├── translations/                # UI label translations for EpiDoc/SigiDoc stylesheets
│   │   └── messages_en.xml
│   ├── website/                     # Website templates & assets
│   │   ├── _includes/
│   │   │   ├── layouts/
│   │   │   │   ├── base.njk        # Root HTML layout
│   │   │   │   └── document.njk    # Document page layout
│   │   │   ├── header.njk
│   │   │   └── footer.njk
│   │   ├── assets/
│   │   │   └── css/
│   │   │       ├── base.css
│   │   │       ├── epidoc.css
│   │   │       └── project.css
│   │   ├── index.njk               # Homepage
│   │   └── eleventy.config.js      # Static site generator config
│   └── metadata-config.xsl          # Index & search configuration
```

::: details What are all these files?
- **`pipeline.xml`**: defines the processing steps that transform your XML into a website (more on this shortly)
- **`source/stylesheets/sigidoc/`**: the upstream SigiDoc XSLT stylesheets, cloned from the official repository
- **`source/stylesheets/lib/`**: framework-provided XSLT stylesheets that glue everything together
- **`source/stylesheets/overrides.xsl`**: a place for your project-specific XSLT overrides (empty by default)
- **`source/translations/`**: translation files for UI labels in the EpiDoc/SigiDoc XSLT output (e.g., "Material", "Type", "Dating")
- **`source/website/`**: the website template: HTML layouts, CSS, and the homepage
- **`source/website/eleventy.config.js`**: configures the Eleventy static site generator (language detection, translation filter)
- **`source/metadata-config.xsl`**: configures which metadata fields to extract for indices and search
- **`source/authority/`**: will hold your controlled vocabulary XML files (geography, bibliography, etc.)
:::

> [!tip]
> The project structure is flexible: you can organize your source files however you like. But we recommend following this structure, which is what the documentation and examples use.

## First Build

Let's build the project to see what we have. Open the project folder in the EFES-NG Prototype desktop application and click **Start**.

The pipeline will run through its steps and generate the website. Once complete, click **Preview** to open it in your browser.

You should see a generic site with a header, navigation, and footer, but no content yet. That's expected: we haven't added any XML source documents.

Next, let's understand what the pipeline is doing: [Exploring the Project →](./explore-project)
