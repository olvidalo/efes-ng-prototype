# Design Decisions

This page explains some of the architectural and technology choices behind the EFES-NG Prototype.

::: warning Prototype note
Some of these principles are currently only partially implemented in the prototype, or implemented with certain limitations that should be addressed in future iterations.
:::

## Layers of Sustainability

The architecture follows a "layers of sustainability" principle. The most critical components have the fewest dependencies and greatest longevity:

1. **EpiDoc XML data** (standard, tool-independent, will outlast any software)
2. **Generated static site** (plain HTML/CSS/JS, deployable anywhere, works forever)
3. **XSLT stylesheets** (standardized language, theoretically portable across processors)
4. **Pipeline configuration and templates** (project-local, readable XML and HTML templates)
5. **Build tooling** (the EFES-NG framework itself and the command line interface)
6. **Desktop application and live preview** (convenience layer, replaceable)

If the framework disappears, layers 1 through 4 remain intact. If XSLT processors change, layers 1 and 2 survive. The scholarly content is never locked into any specific tool.

## Why Static Output?

The original EFES requires a running Java application server (Apache Cocoon). This means ongoing server maintenance and security updates, hosting costs and technical expertise, and a single point of failure. If the server goes down or the institution can no longer maintain it, the published collection becomes inaccessible.

EFES-NG generates a complete static website: plain HTML, CSS, and JavaScript files that can be hosted on GitHub Pages, any web server, or archived as-is. No runtime, no database, no server-side processing. The published collection remains accessible with zero maintenance.

## Self-Contained Projects

A project should be a complete, standalone directory that contains everything needed to reproduce its output. If the EFES-NG framework disappears, the project should still be buildable.

This is why framework XSLTs (`extract-metadata.xsl`, `aggregate-indices.xsl`, etc.) are scaffolded into each project's `source/stylesheets/lib/` rather than referenced from the framework installation. The `pipeline.xml` is a declarative description of what needs to happen: which stylesheets to apply, in which order, with which parameters. Given a standards-compliant XSLT 3.0 processor (such as Java Saxon) and a static site generator, all the steps described in the pipeline could be reproduced manually, with a Makefile, or with a shell script. The EFES-NG framework automates this process, but is not the only way to execute it.

The current prototype uses Eleventy for site generation, which introduces a Node.js dependency. The pipeline generates JSON sidecar data files (`.11tydata.json`) that tell Eleventy how to render each page (layout, title, tags). This is a common pattern across static site generators, not an Eleventy-specific concept, so migrating to another SSG would require adapting the data file format but not the overall approach. The website templates themselves are simple HTML with lightweight templating and could be migrated similarly. To push sustainability even further, a pure XSLT-based site assembly (similar to how [Kiln](https://github.com/kcl-ddh/kiln) works) could replace the static site generator entirely, keeping the entire toolchain within the XML ecosystem.

The same self-containment principle applies to web assets: all dependencies are bundled in the project's `assets/` directory, not loaded from CDNs. The generated site works offline and doesn't depend on external services. This currently includes Foundation 4.3.1 and jQuery 1.10.2, which are required by the EpiDoc and SigiDoc stylesheets for transcription tabs (to switch between interpretative and diplomatic versions)  and grid layout in the rendered editions. These are legacy dependencies that the stylesheet maintainers could eventually replace with modern, dependency-free CSS and JavaScript, further reducing the project's footprint.

**Trade-off: framework updates.** The downside of scaffolding framework files into each project is that updating the framework requires merging changes into project-local copies. If a project has customized a framework XSLT or template, updating to a newer framework version means reconciling those customizations with the upstream changes. This is the classic trade-off between independence and ease of update. Future iterations could mitigate this with tooling that assists with framework upgrades, or with a cleaner separation between framework logic and project-specific extension points.

## XSLT Stylesheet Compatibility

The EpiDoc stylesheets are community-maintained, complex, and encode years of scholarly decisions about transcription display. Reimplementing them would be prohibitively expensive and error-prone. Therefore, a core requirement is that existing EpiDoc and SigiDoc stylesheets work with minimal or no modifications.

Saxon-JS provides full XSLT 3.0 support in JavaScript, eliminating the need for Java-based Saxon while maintaining complete stylesheet compatibility. Minor incompatibilities (Cocoon-specific URLs, hardcoded file paths) can be resolved through preprocessing steps in the pipeline, transparent to the user.

## Why a Custom Pipeline System?

To orchestrate the transformation from EpiDoc XML to static sites, a build system coordinates XSLT processing, file operations, and static site generation. Several existing tools were considered:

- **[Make](https://en.wikipedia.org/wiki/Make_(software))**: The traditional dependency-based build tool. Would require complex shell scripting to coordinate Saxon-JS with XSLT processing and file operations. Cross-platform support (Windows) would be poor. Makefiles are not easily readable by scholars with only XML/XSLT expertise.
- [**Gulp**](https://gulpjs.com/): JavaScript-native, popular for web builds. Requires coordinating many third-party plugins or writing them ourselves with complex stream-based configuration. Adds abstractions between what are fundamentally straightforward file transformations.
- **[XProc](https://xproc.org/)**: Purpose-built for XML pipelines. Implementations (such as [XML Calabash](https://www.xmlcalabash.com/) are slow and difficult to debug, and it cannot parallelize processing steps.
- **Shell scripts / batch files**: Simple but no dependency tracking, no caching, no parallelization, not cross-platform.

Instead, a lightweight TypeScript pipeline system was developed that provides exactly what's needed:

- **Automatic dependency inference** from data flow between steps (no manual ordering)
- **Caching** optimized for expensive XSLT operations (incremental rebuilds in seconds, not minutes)
- **Parallel execution** of independent steps across multiple CPU cores
- **Readable configuration** (`pipeline.xml` serves as documentation of the complete transformation process)
- **Direct integration** with [Saxon-JS](https://www.saxonica.com/saxonjs/index.xml), Eleventy, and the desktop application
- **Live preview support** where scholars need instant feedback while editing

## Why Eleventy?

A static site generator wraps XSLT-produced HTML fragments in page layouts with navigation, headers, and footers, and generates collection pages from metadata.

A JavaScript-based generator was chosen to maintain a unified technology stack: Saxon-JS, the pipeline system, the desktop application, and browser-based search all use JavaScript. This eliminates the complexity of managing multiple language runtimes and their dependencies.

Among JavaScript static site generators, **[Eleventy](https://www.11ty.dev/)** was selected over framework-heavy alternatives like Next.js and Astro because:

- It imposes no specific architecture and generates lightweight HTML without requiring client-side JavaScript frameworks
- The generated pages are simple, readable HTML that will continue to function even as JavaScript frameworks evolve
- Its HTML-based templating (Nunjucks) follows concepts that are not unlike those of [Kiln](https://github.com/kcl-ddh/kiln) templates, easing the conceptual transition for existing EFES users
- It has minimal dependencies and is actively maintained

## Client-Side Search

Search and faceted browsing must work without server infrastructure. This means running the search entirely in the browser, using data generated during the build.

The search component (`efes-search`) is a set of Web Components that load a JSON data file produced by the pipeline and provide full-text search, faceted filtering, date range filtering, and sorting. Faceting and filtering are implemented in the search component itself, independent of the underlying search library. The search library is only used for full-text indexing and querying.

The prototype uses [FlexSearch](https://github.com/nextapps-de/flexsearch) for full-text search, selected for its small index size and fast performance. Testing with the IRCyr collection (2,360 documents) showed search page initialization in ~1.5 seconds and query response in under 1.5 seconds, even under simulated mid-range hardware conditions.

Since the search component's architecture separates faceting from full-text indexing, the underlying search library could be replaced (e.g., with Lunr.js for advanced query syntax, or MiniSearch for different performance characteristics) without affecting the faceting, filtering, or UI. For very large collections where client-side search becomes impractical, the same component architecture could support server-side search backends through an adapter pattern.

## Desktop Application

Scholars without command-line experience need a way to create, build, and preview their collections. An Electron-based desktop application packages the entire toolchain, including Node.js, Saxon-JS, Eleventy, and all dependencies, into a single installable application for Windows, macOS, and Linux. Users download one application and everything works. No need to install Node.js, manage npm packages, or deal with version conflicts. It provides:

- Project creation wizard
- Pipeline execution with real-time progress
- Live preview with hot reload
- Site export for deployment

The desktop app is the topmost layer of sustainability: it provides convenience but can be replaced without affecting any other layer. The same pipelines can always be run from the command line by users who prefer that workflow or need to integrate with other tools.

## Project as Git Repository

The scaffolded project structure is designed to work well as a Git repository. A typical project contains three kinds of content with different ownership:

1. **Project-specific files** (pipeline.xml, metadata-config.xsl, website templates, translations, CSS): authored and maintained by the project editors, versioned in the project repository.
2. **External stylesheets** (EpiDoc or SigiDoc XSLT stylesheets): maintained by their respective communities, included as Git submodules pointing to upstream repositories.
3. **XML corpus and authority files**: may be maintained in their own repositories (especially for shared collections), also included as submodules, or kept directly in the project repository for smaller, self-contained collections.

Git submodules keep a clean separation between what the project owns and what it references. Editors can update stylesheets or corpus data by advancing the submodule pointer to a newer commit, without mixing upstream changes into their own version history. The CI workflow checks out submodules automatically (`submodules: true`), so deployment works without manual steps.

This structure also supports collaboration: the EpiDoc stylesheet community can continue their work independently, corpus editors can manage their XML data in a dedicated repository, and the publication project ties them together with its own configuration and templates.
