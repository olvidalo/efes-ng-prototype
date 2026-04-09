# Tutorial: Building a SigiDoc Edition

In this tutorial, we will re-create the [SigiDoc](https://sigidoc.huma-num.fr/) edition of the Robert Feind Collection from scratch. By the end, you will have a working multi-language website that displays Byzantine seal descriptions with metadata, indices, and search.

## What We Will Create

The finished site will include:

- **Seal pages** — each Byzantine seal rendered as an HTML page from its SigiDoc/EpiDoc XML source, with transcriptions, metadata, and images
- **Multi-language support** — the same seals published in English, German, and Greek
- **Indices** — browsable tables of persons, places, dignities, offices, and other controlled vocabularies
- **Search** — client-side full-text search across all seals
- **Bibliography** — linked bibliographic references

## How We Will Create It

We will use the EFES-NG Prototype desktop application to:

1. **Generate a new project** using the built-in project generator
2. **Explore** the generated project structure and pipeline
3. **Customize** the website templates (header, footer, navigation, styling)
4. **Add content** — connect our SigiDoc XML sources and configure the pipeline to transform them
5. **Build and preview** the site using the built-in live preview

> [!tip] Prerequisites
> Before starting, make sure you have [Node.js](https://nodejs.org/) 20 or later installed, and download the EFES-NG Prototype desktop application.

Let's get started — [Creating a Project →](./create-project)
