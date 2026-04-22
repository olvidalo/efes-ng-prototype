# Limitations and Future Work

This page collects known issues, documentation gaps, and ideas for future iterations. None of the items below are commitments, but together they sketch where the framework could grow.

## Known Issues

### Foundation and jQuery legacy dependencies

The EpiDoc and SigiDoc stylesheets require Foundation 4.3.1 and jQuery 1.10.2 for tabbed transcription views and grid layout. These are currently hardcoded in the framework. Addressing this requires upstream stylesheet changes to drop the dependency on these legacy libraries (for example, reimplementing tabs and grid in modern, dependency-free CSS and JavaScript).

### Symbols in inscriptions and bibliography links

Some special symbols do not render correctly in inscriptions, and certain bibliography links do not resolve as expected. These depend on upstream changes to the EpiDoc Stylesheets. A pull request is open at [EpiDoc/Stylesheets#23](https://github.com/EpiDoc/Stylesheets/pull/23).

### IRCyr example project images

The [IRCyr example](./example-projects) loads inscription images from the original IRCyr server, which has since added bot protection. Images therefore fail to load when browsing the deployed example. A workaround would require hosting the images alongside the example or pointing to an alternate source.

## Possible Future Improvements

### Pipeline and configuration

- **Templating in `pipeline.xml`.** Pipelines tend to repeat similar input and output blocks across nodes. Currently, variables are supported. A simple templating mechanism (variables, includes, parametric node definitions) would reduce copy-paste.
- **Multiple final outputs.** A pipeline currently produces one assembled site. Defining multiple final outputs, or enabling and disabling individual branches at run time, would allow publishing a subset or generating alternate formats from the same project.
- **Index reuse and dependencies.** Allowing one part of `metadata-config.xsl` to refer to another (e.g. exposing index entries as a variable that search facets can reuse) would avoid duplicating extraction logic.
- **Incremental index rebuilds.** Index aggregation currently re-runs against the full set of metadata files whenever anything changes. A finer-grained incremental approach (similar to how single-document transformations are cached) would speed up rebuilds for large collections. This would have to be handled at XSLT layer.

### Translations

- **Unified translation source.** UI labels are currently maintained in two places: XSLT-side (`source/translations/messages_*.xml`, used by the EpiDoc/SigiDoc stylesheets) and Eleventy-side (template translations). Merging these into a single source would reduce friction.

### Rendering

- **Pure XSLT site assembly.** Eleventy could in principle be replaced with an XSLT-based template system (similar to how Kiln works), keeping the entire toolchain within the XML ecosystem. See [Design Decisions: Self-Contained Projects](./design-decisions#self-contained-projects).
- **More content rendered via XSLT.** Even without replacing the static site generator, some content currently assembled by Eleventy templates (index entries, formatted bibliography entries) could move into XSLT, keeping more of the rendering logic in the XML pipeline.

### Components

- **Geo map.** A convenience component wrapping a mapping library (such as Leaflet) for places-on-a-map views. Map tiles would be external dependencies contradicting the self-contained projects prinicple . Self-hosting tile imagery is possible but space-intensive, so a self-hosted option would likely be limited to cropped maps or low zoom levels.
- **RTI / image viewer.** A convenience component wrapping a viewer such as OpenLime for high-resolution and RTI images on document pages.

### Search

- **Adapter pattern for search backends.** The search component could be extended to allow alternative full-text backends behind a common interface. Adapters could target other client-side libraries (Lunr, MiniSearch), self-hosted server-side engines (OpenSearch, Elasticsearch, eXist-db, BaseX), or hosted services (Algolia).
- **Advanced search options.** Stemming, stop words, and other tuning options are not currently exposed, and support for ancient languages is limited. Porting a stemmer for ancient greek 
### Versioning and updates

- **Framework, schema, library, and component versioning.** Because lib stylesheets and client components are scaffolded into each project (see [Design Decisions: Self-Contained Projects](./design-decisions#self-contained-projects)), updating to a newer framework version means merging upstream changes into project-local copies. A versioning scheme and an assisted update workflow (tooling that highlights or applies upstream changes, or manifest-style version pins) could make this safer and less manual.

## Documentation Gaps

A few existing features are not yet covered in this guide and would benefit from a worked example:

- **Search facet deduplication.** Multi-valued search fields (those emitted as `<item>` children by the `extract-search` template) are automatically deduplicated per document and per language by `extract-metadata.xsl`. This is worth mentioning as users don't need to write   dedup logic in their templates.
- **Facet translations.** Facet labels can be localised either by referencing authority files or by providing a translation map in `metadata-config.xsl`. Both approaches need a short walkthrough.
- **Paginated template location.** Templates for paginated index pages can live anywhere under `source/website/` (e.g. `source/website/_indices/`). The example projects place them at the root for simplicity, but this is convention, not requirement.
- **Image references and asset handling.** Conventions for referencing inscription or seal images from XML, organising them inside a project, and deploying them (locally or to an external host) are not covered yet.
- **Deployment to Netlify, Cloudflare Pages, and similar.** The current [deployment guide](./deployment) focuses on GitHub Pages. Free tiers of Netlify, Cloudflare Pages, and other static hosts are equally suitable. A short scaffold for each (redirects file, headers file, build commands) would be useful.