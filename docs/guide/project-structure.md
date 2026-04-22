# Project Structure

A typical EFES-NG project has the following structure:

```
my-project/
├── pipeline.xml              # Pipeline definition
├── source/
│   ├── inscriptions/         # EpiDoc XML documents
│   ├── texts/                # TEI text pages
│   ├── authority/            # Controlled vocabularies
│   ├── stylesheets/
│   │   ├── epidoc/           # Upstream EpiDoc stylesheets (cloned)
│   │   ├── lib/              # Framework-provided XSLT
│   │   └── overrides.xsl     # Project-level XSLT overrides
│   └── website/              # Eleventy templates, assets & config
│       ├── _includes/
│       │   └── layouts/
│       ├── assets/
│       └── eleventy.config.js
├── _assembly/                # Assembled site (generated)
├── _output/                  # Final static site (generated)
├── .efes-build/              # Node workspaces (generated)
└── .efes-cache/              # Build cache (generated)
```

> [!tip]
> The project structure is flexible, you can organize your source files however you like. The structure shown here is the recommended convention used by the project generator and this documentation. See [Designing Sustainable Projects](/guide/designing-sustainable-projects) for the principles that behind these conventions.

## Conventions

- **`source/`**: all authored content, version-controlled
- **`_` prefix**: generated directories, don't edit manually
- **`.` prefix**: hidden/internal directories
- **`pipeline.xml`**: the pipeline definition (one per project)

## Generated Directories

| Directory | Purpose |
|-----------|---------|
| `_assembly/` | Intermediate Eleventy site assembled from pipeline outputs |
| `_output/` | Final built website, ready to deploy |
| `.efes-build/` | Per-node working directories |
| `.efes-cache/` | Build cache for incremental rebuilds |

These are all gitignored and can be safely deleted (stop the pipeline and click **Clean** in the GUI, or run `efes-ng clean` on the command line).
