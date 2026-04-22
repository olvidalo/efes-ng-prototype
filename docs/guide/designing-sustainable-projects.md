# Designing Sustainable Projects

The EFES-NG Prototype is intentionally minimal at its core: a system for getting from A to B through a series of small, self-contained, reproducible steps. The shape of the pipeline graph, the granularity of each step, and the structure of your XSLT stylesheets are all project-level decisions. The recommended structure used throughout this guide is one shape projects can take, geared toward EpiDoc and SigiDoc publications. Other projects may look quite different.

This page describes the principles behind the patterns used in the example projects, the project generator, and the rest of this guide. They apply regardless of how a project is shaped. These are recommendations rather than requirements, but they favour transparency, longevity, and the ability of someone unfamiliar with the project (perhaps yourself in five years) to follow what it does.

## Prefer pipeline complexity to step complexity

One could write an XSLT that walks the corpus, extracts metadata, prunes language variants, resolves authority links, and emits HTML pages, all in one pass. It works, but a year later it can be hard to follow, and a small change risks breaking something far away.

The same work split into five steps in `pipeline.xml`, each with its own input, output, and stylesheet, behaves quite differently. The dependency graph makes the order obvious. Each intermediate sits on disk and can be opened and read. A change touches one step.

When a transformation grows complicated, prefer adding another step over making an existing step do more. The pipeline carries the complexity; the individual steps stay simple.

::: details Why this also matters for caching
The pipeline caches each step's output and re-runs only what changed. A step that does many things invalidates as a whole: change one input and the entire artefact is rebuilt. A small step with a narrow input set re-runs only when that narrow input actually changes. Splitting steps therefore tends to make incremental builds faster as well as easier to reason about.
:::

::: tip Further reading
For more on small-step pipelines as a way to manage complexity in XSLT, see Schaeben & Barabucci, [Small-step pipelines reduce the complexity of XSLT/XPath programs](https://dl.acm.org/doi/10.1145/3469096.3474922) (DocEng '21), which measures the effect quantitatively across a set of XSLT data-curation tasks.
:::

## Avoid hidden external dependencies

A step is self-contained when its behaviour is determined entirely by its declared inputs, the code it executes, and files within the project. XSLT makes it easy to reach outside this boundary: `xsl:import` can pull in a stylesheet from anywhere on disk, `doc()` can read from arbitrary URLs, and `collection()` can scan a directory the pipeline never declared as an input. These mechanisms have legitimate uses (the EpiDoc and SigiDoc stylesheets, included as Git submodules, are imported this way), but they should always point inside the project tree.

Watch out for:

- An `xsl:import` href that resolves to a stylesheet on the author's local machine (`/Users/jdoe/xslt-tools/utility.xsl`)
- A `doc()` call against a remote URL whose content might change or disappear
- A `collection()` over a directory the pipeline doesn't declare as an input (the cache cannot know when to invalidate)
- A node that reads a file the framework happens to copy into place, but that isn't wired through `<from>` or `<files>`

A useful test: *if I cloned this project on a fresh machine and ran the pipeline, would it produce the same result?* If not, an implicit dependency is leaking in somewhere.

## Don't presuppose an environment

Beyond file paths, also avoid depending on:

- Tools or libraries installed globally on your machine
- CDN-hosted JavaScript, fonts, or stylesheets in the published site
- Network services that may not be available at build time

Web assets should go in `source/website/assets/` or similar, not on a third-party server. Authority data should be part of the project (committed or preferably included as a tracked git submodule), not fetched at build time. The build should run without internet access once dependencies are installed.

This is what lets a project survive its tooling. With everything the build needs in the repository, in ten years someone with a working XSLT 3.0 processor and a static site generator can still reconstruct the site, even if the EFES-NG framework itself is no longer maintained. (See [Design Decisions: Self-Contained Projects](/guide/design-decisions#self-contained-projects) for how this principle shaped the design of the EFES-NG Prototype).

The same logic applies *inside* the project, between the pipeline and the static site generator. Keep a clean line between transformation (pipeline produces data) and assembly (the SSG consumes data). Pipeline outputs should be data: JSON, HTML fragments, sidecar files with simple schemas. Don't have the pipeline produce template syntax (`.njk`, `.liquid`), generator configuration (`eleventy.config.js` extensions), or runtime code. Sidecars with SSG-specific *keys* (e.g. `layout: "document.njk"` in a `.11tydata.json`) are fine, since they are still data and keep the contract narrow. Generated templates and configuration are not, because they fuse the XSLT / data curation part of the pipeline and SSG site generation into a single layer that can't be replaced without rewriting both halves.

## Make each step human-verifiable

Every step should do one specific thing whose output a human can read and judge. *Did this metadata extraction get the date right?* should be answerable by opening one file. *Does this index include the persons from this document?* should be answerable by reading one JSON. This matters in three places:

- **Debugging**: when the final site is wrong, you can walk back through the pipeline and find the first step whose output looks wrong.
- **Reviewing**: a collaborator can check what each step produced without rerunning the whole build.
- **Trust**: scholars publishing their work can see exactly what their data became at each stage. There are no hidden conversions.

Steps that produce huge, opaque artefacts (a single bundled site, a binary index, a minified blob) are harder to verify. Where possible, intermediate steps should produce readable XML, JSON, or HTML, with the heavy assembly happening only at the end. The framework supports this by letting you [run a single step on a single file in Oxygen](./oxygen-project) and inspect its output directly.

## Why this matters

These principles share a common goal: making the project, rather than the framework, the unit of sustainability. A project that follows them tends to have these properties:

- Anyone reading the project can understand and reproduce the build.
- Migrating to a different processor, framework, or build system is mechanical, not exploratory.
- Errors are local: one wrong step is one wrong file you can open and inspect.

The framework is one of the more replaceable layers in the [layers of sustainability](/guide/design-decisions#layers-of-sustainability). Following these principles is what keeps that promise practical: when the framework eventually changes or disappears, the project can be built without it.
