# Multi-Language Support

So far, our seals are published in English only. The SigiDoc Feind Collection is available in three languages — English, German, and Greek. Let's add German.

Multi-language support involves three layers: source content, XSLT UI labels, and the website shell. See [Multi-Language Architecture](/guide/multi-language-architecture) for the full picture — here we'll work through each layer hands-on.

## Step 1: German Seal Pages

With a static site, each language version needs its own set of HTML pages. Remember how we [pruned to English](./adding-content#fixing-with-language-pruning) because the source XML contains all languages side by side? Now we'll add a German pipeline chain alongside the English one.

> [!info] We're working with: Pipeline Configuration (pipeline.xml)

### Pipeline Nodes

Add these nodes to `pipeline.xml`. The pattern mirrors the English chain — prune, transform, extract metadata, generate data — with German language settings:

```xml
<!-- ===== GERMAN ===== -->

<xsltTransform name="prune-epidoc-german">
    <sourceFiles><files>source/seals/*.xml</files></sourceFiles>
    <stylesheet>
        <files>source/stylesheets/lib/prune-to-language.xsl</files>
    </stylesheet>
    <stylesheetParams>
        <param name="language">de</param>
    </stylesheetParams>
</xsltTransform>

<xsltTransform name="transform-epidoc-german">
    <sourceFiles>
        <from node="prune-epidoc-german" output="transformed"/>
    </sourceFiles>
    <stylesheet>
        <files>source/stylesheets/lib/epidoc-to-html.xsl</files>
    </stylesheet>
    <stylesheetParams>
        <param name="edn-structure">sigidoc</param>
        <param name="edition-type">interpretive</param>
        <param name="leiden-style">sigidoc</param>
        <param name="line-inc">1</param>
        <param name="verse-lines">off</param>
        <param name="bib-link-template">../../bibliography/$1/</param>
        <param name="language">de</param>
        <param name="messages-file"><files>source/translations/messages_de.xml</files></param>
    </stylesheetParams>
    <output to="_assembly/de/seals"
            stripPrefix="source/seals"
            extension=".html"/>
</xsltTransform>

<xsltTransform name="extract-epidoc-metadata-german">
    <sourceFiles>
        <from node="prune-epidoc-german" output="transformed"/>
    </sourceFiles>
    <stylesheet><files>source/indices-config.xsl</files></stylesheet>
</xsltTransform>

<xsltTransform name="generate-eleventy-data-german">
    <sourceFiles>
        <from node="extract-epidoc-metadata-german" output="transformed"/>
    </sourceFiles>
    <stylesheet>
        <files>source/stylesheets/lib/create-11ty-data.xsl</files>
    </stylesheet>
    <stylesheetParams>
        <param name="layout">layouts/document.njk</param>
        <param name="tags">seals</param>
    </stylesheetParams>
    <output to="_assembly/de/seals"
            stripPrefix="source/seals"
            extension=".11tydata.json"/>
</xsltTransform>
```

Notice:
- Each node name uses a `-german` suffix
- `<param name="language">de</param>` selects German content and UI labels
- Output paths use `de/seals` instead of `en/seals`
- The `tags` parameter stays `seals` — both languages contribute to the same collection, and the template will filter by language later

### German UI Labels

Remember how we [downloaded `messages_en.xml`](./adding-content#step-3-stylesheet-parameters) for English UI labels like "Material", "Type", "Dating"? The SigiDoc stylesheets use `i18n:text` placeholders that get resolved from these message files.

Download `messages_de.xml` from the [SigiDoc EFES repository](https://github.com/SigiDoc/EFES-SigiDoc/blob/master/webapps/ROOT/assets/translations/messages_de.xml) and save it to `source/translations/messages_de.xml`. The `messages-file` parameter we set on the transform node points to this file and registers it as a tracked dependency — so edits to the translations trigger a rebuild.

### Build and Inspect

Rebuild. You should see the four new German nodes in the pipeline. Once complete, navigate to `/de/seals/Feind_Kr1/` — the seal content is now in German, with German UI labels.

The seal list at `/de/seals/` won't work yet — that's a website shell concern, which we'll handle next.

## Step 2: German Seal List

The German seal pages work, but the seal list at `/de/seals/` doesn't exist yet. Let's fix that.

> [!info] We're switching to: Website Templates (source/website/)

The simplest approach: copy the English seal list template. Duplicate `source/website/en/seals/index.njk` to `source/website/de/seals/index.njk` and make two changes:

1. Change the title to "Siegel"
2. Change `documentBasePath` to `/de/seals`

```nunjucks
---
layout: layouts/base.njk
title: Siegel
---

{# Collection name must match the "tags" stylesheet parameter in the generate-eleventy-data pipeline node #}
{% set documents = collections.seals %}
```

Wait — `collections.seals` now contains both English *and* German seals (they share the same `tags` value). We need to filter by language. The `language` field in each seal's sidecar JSON makes this possible:

```nunjucks
{% set langSeals = [] %}
{% for seal in collections.seals %}
    {% if seal.data.language == "de" %}
        {% set langSeals = (langSeals.push(seal), langSeals) %}
    {% endif %}
{% endfor %}
{% set sorted = langSeals | sort(false, false, "data.sortKey") %}
```

Do the same for `document.njk` — copy `source/website/_includes/layouts/document.njk` or update it to filter by language. Rebuild, and the German seal list at `/de/seals/` shows only German seals.

### This Works — But Doesn't Scale

We now have a working German seal list. You could stop here for a two-language project — it's simple and explicit.

But notice what happened: we copied a template file and hardcoded `"de"` in it. If we add Greek, we copy again. Every change to the table layout needs updating in all copies. For three or more languages, this becomes tedious and error-prone.

If you want a more maintainable approach, read on. Otherwise, skip to [Adding More Languages](#adding-more-languages).

### A Better Way: One Template, Multiple Languages

Eleventy's **permalink** feature lets a single template produce pages at different URLs. Instead of separate copies per language, we write one template and use a variable:

```yaml
---
layout: layouts/base.njk
permalink: "{{ langCode }}/seals/index.html"
pagination:
    data: languages.codes
    size: 1
    alias: langCode
---
```

This requires a data file that lists the supported languages. Create `source/website/_data/languages.json`:

```json
{
    "codes": ["en", "de"]
}
```

Eleventy evaluates the `langCode` variable for each language code and generates a page for each:

| `langCode` | Output URL |
|------------|-----------|
| `en` | `/en/seals/` |
| `de` | `/de/seals/` |

The language filtering becomes generic too — using `langCode` instead of hardcoded `"de"`:

```nunjucks
{% set langSeals = [] %}
{% for seal in collections.seals %}
    {% if seal.data.language == langCode %}
        {% set langSeals = (langSeals.push(seal), langSeals) %}
    {% endif %}
{% endfor %}
```

With this approach, the original `en/seals/index.njk` and the copied `de/seals/index.njk` are replaced by a single `seals.njk` at the root of `source/website/`. Adding Greek later is just adding `"el"` to `languages.json`.

> [!tip]
> Permalink only matters for templates that need to produce multiple outputs. For pipeline-generated content (like the individual seal HTML pages), the output path is determined by the pipeline's `<output>` configuration — no permalink needed.

### Translating the Website Shell

The header still says "Seals" in both language versions. To translate menu items, page titles, and other UI text, create translation data files:

Create `source/website/_data/translations/en.json` and `source/website/_data/translations/de.json`:

::: details What goes in the translation files?
These provide translated strings for the website shell. For example:

```json
{
    "nav": {
        "seals": "Seals",
        "indices": "Indices",
        "search": "Search"
    },
    "seals": {
        "pageTitle": "Seals"
    }
}
```

The German version has `"Siegel"`, `"Indizes"`, `"Suche"`, etc. Templates use `translations[langCode].nav.seals` instead of hardcoded text. See the SigiDoc FEIND project's `source/website/_data/translations/` for a complete example.
:::

The same permalink pagination + translation data pattern applies to all templates: the seal list, index pages, the homepage, header, footer, and any other page that needs language variants.

::: details This is a lot of template changes...
It is — each template needs to switch from hardcoded paths and direct collection access to language-parameterized versions. The SigiDoc FEIND project's `source/website/` directory shows the complete set of multi-language templates — use it as a reference for your own project.

For simpler projects, the copy-per-language approach works fine. The pagination machinery is optional — it just scales better.
:::

## Adding More Languages

To add Greek (or any other language), repeat the same steps:

1. Add pipeline nodes (`prune-epidoc-greek`, `transform-epidoc-greek`, `extract-epidoc-metadata-greek`, `generate-eleventy-data-greek`) with `language=el`
2. Add `messages_el.xml` translation file
3. If using the permalink approach: add `"el"` to `languages.json` and create `el.json` translation data
4. If using the copy approach: duplicate templates with `el` paths and language filtering

## What We've Built

The complete multi-language pipeline:

```mermaid
flowchart TD
    seals[/"source/seals/Feind_*.xml"/]

    prune_en["Node: prune-epidoc-english"]
    prune_de["Node: prune-epidoc-german"]

    subgraph English
        transform_en["transform-epidoc"]
        extract_en["extract-epidoc-metadata"]
        data_en["generate-eleventy-data"]
    end

    subgraph German
        transform_de["transform-epidoc-german"]
        extract_de["extract-epidoc-metadata-german"]
        data_de["generate-eleventy-data-german"]
    end

    agg["Node: aggregate-indices"]
    search["Node: aggregate-search-data"]
    build["Node: eleventy-build"]
    output(["_output/"])

    seals --> prune_en
    seals --> prune_de

    prune_en --> transform_en
    prune_en --> extract_en
    extract_en --> data_en
    extract_en --> agg
    extract_en --> search

    prune_de --> transform_de
    prune_de --> extract_de
    extract_de --> data_de

    transform_en --> build
    data_en --> build
    transform_de --> build
    data_de --> build
    agg --> build
    search --> build
    build --> output

    style prune_de stroke:#2563eb,stroke-width:3px
    style transform_de stroke:#2563eb,stroke-width:3px
    style extract_de stroke:#2563eb,stroke-width:3px
    style data_de stroke:#2563eb,stroke-width:3px
    style output fill:#fff3e0,stroke:#ff9800
```

The German pipeline chain (highlighted in blue) mirrors the English chain. Both feed into the same Eleventy build, which produces a unified multi-language site.
