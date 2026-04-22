# Static Site Generation

## What is a Static Site?

A static website consists of plain HTML, CSS, and JavaScript files that can be served by any web server. No database, no application server or runtime is required. A static site can be hosted on any web server, GitHub pages, Netlify, or other low-cost options.

## Why a Static Site Generator?

The XSLT transformations in the pipeline produce HTML *fragments*: the content of each inscription or seal page. But a complete website needs more: headers, footers, navigation, CSS, index pages, search.

A **static site generator** (SSG) bridges this gap. It takes the HTML fragments and wraps them in page templates, generates index pages from metadata, and produces the final set of HTML files.

## Eleventy

The EFES-NG Prototype uses [Eleventy](https://www.11ty.dev/) (11ty) as its static site generator. Eleventy:

- Processes [Nunjucks](https://mozilla.github.io/nunjucks/) templates (the `.njk` files in your `source/website/` directory)
- Wraps content in layouts (`base.njk`, `document.njk`)
- Generates collection pages (e.g., the seal list) from tagged content
- Copies static assets (CSS, JavaScript, images) to the output

### How Content Becomes a Page

When the pipeline transforms a seal XML file, it produces two files:

1. **`Feind_Kr1.html`**: the HTML fragment (transcription, metadata, commentary)
2. **`Feind_Kr1.11tydata.json`**: a sidecar data file specifying the layout, title, and tags

Eleventy reads both, wraps the HTML in the `document.njk` layout, and outputs a complete page with the site header, navigation, and footer.

### Templates

Templates live in `source/website/_includes/layouts/`:

- **`base.njk`**: the root layout: `<html>`, `<head>`, CSS links, header, footer
- **`document.njk`**: extends `base.njk`, adds document-specific features (navigation between items, metadata display)

## A Note on Alternatives

Using Eleventy is one choice made for this prototype. The pipeline system is generic enough that other static site generators (such as [Hugo](https://gohugo.io/)) could be integrated.

In theory, an XSLT-based template system, similar to what [Kiln](https://github.com/kcl-ddh/kiln) uses, could replace the SSG entirely, keeping the entire toolchain within the XML ecosystem. This prototype uses Eleventy for pragmatic reasons: it's well-established, flexible, and straightforward to integrate.
