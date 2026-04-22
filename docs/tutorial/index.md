# Tutorial: Building a SigiDoc Edition

In this tutorial, we will re-create the [SigiDoc]([https://sigidoc.huma-num.fr/](https://github.com/SigiDoc)) edition of the [Robert Feind Collection](https://feind.sigidoc.cceh.uni-koeln.de/de/) from scratch, using the already encoded SigiDoc files from the collection repository. By the end, you will have a working multi-language website that displays seal descriptions with metadata, indices, and search.

Much of the complexity of this tutorial goes back to the fact that the starter template ("scaffold") created by the EFES-NG Prototype is designed for mono-lingual (specifically English-only) editions for EpiDoc inscriptions, while the encoded Seals from the Feind collection contain data for multiple languages. Adapting the mono-lingual scaffold for a mutli-lingual edition should help to get familiar with the internal workings of this framework. We will do this step-by-step: First, we will try to get a basic English version of the website working based on the multi-lingual input data. Then, we will extend the project to include a multi-lingual website shell along with the seal pages in English, German, and Greek. 

The tutorial gives step-by-step instructions for adapting the scaffolded starter project. Some sections also explain the technical detail behind those changes: why they are necessary, what they do, and how they work. Reading those explanations isn't required to build a working edition site, but they help when planning more advanced customisations. Skip them on a first read and come back later if needed.

> [!tip] Prerequesites
> To follow this tutorial, some knowledge of XML, XSLT, and XPath is required. A basic understanding of HTML and CSS is beneficial for customising the website templates.

## What We Will Create

The finished site will include:

- **Seal pages**: each seal rendered as an HTML page from its SigiDoc/EpiDoc XML source, with transcriptions, metadata, and images
- **Multi-language support**: a multi-lingual website with the seals published in English, German, and Greek
- **Indices**: browsable tables of persons, places, dignities, and offices
- **Search**: client-side full-text search across all seals
- **Bibliography**: linked bibliographic references

## How We Will Create It

The tutorial walks through these steps, each on its own page. They build on each other, so following them in order works best, but every step produces a working site you can preview, so you can stop and come back without losing progress.

1. **[Create a project](./create-project)** using the EFES-NG project generator
2. **[Explore the project](./explore-project)**: the directory structure, the pipeline definition, and the rendered output
3. **[Customize the site](./customize-site)**: header, footer, navigation, fonts, and colours
4. **[Add content](./adding-content)** by wiring our SigiDoc XML sources into the pipeline
5. **[Generate metadata and page data](./metadata-and-data)** so each seal becomes its own routable page with the right layout, title, and tags
6. **[Customize the seal list](./customize-seal-list)** to display the columns you want, in the order you want them
7. **[Add indices](./indices)** of persons, dignities, offices, and other entities
8. **[Add search](./search)** with full-text and faceted filtering across the collection
9. **[Add multi-language support](./multi-language)** and translate the site to German
10. **[Connect authority files and build the places index](./places-index)** with cross-references to external resources
11. **[Add bibliography](./bibliography)** with linked references and detail pages
12. **[Deploy](./deploying)** the finished site to GitHub Pages

> [!info] Reading the tutorial
> Two kinds of paths come up throughout:
>
> - **File paths** like `📄 source/website/en/seals/index.njk` (no leading slash) refer to files in your project. Verbs like *open*, *edit*, *rename*, and *find* introduce them.
> - **URLs** like `🌎 /en/seals/` (leading slash) refer to pages in the live preview. Verbs like *visit*, *navigate to*, and *go to* introduce them.
>
> The preview server tries to bind to `localhost:8080`. If that port is in use it falls back to `8081`, `8082`, and so on. The exact URL is shown in the GUI's preview tab. Open the preview from there, then use the relative URLs from the tutorial within that window.

> [!tip] Prerequisites
> Before starting, download the latest version of the EFES-NG Prototype desktop application. See [Desktop Application](/gui) for instructions.

Let's get started: [Creating a Project →](./create-project)
