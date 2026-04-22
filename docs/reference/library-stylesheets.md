# Library Stylesheets

The framework scaffolds a set of generic XSLT stylesheets into every new project under `source/stylesheets/lib/`. They handle the parts of the pipeline that don't depend on project-specific decisions: extracting metadata, aggregating indices and search data, generating Eleventy sidecar files, pruning multilingual content, and wrapping the EpiDoc/SigiDoc rendering stylesheets.

You typically don't edit these files. Project-specific logic lives in `metadata-config.xsl` (which these stylesheets invoke via hook templates), in `pipeline.xml` (which wires them together and passes parameters), and in `overrides.xsl` (imported by `epidoc-to-html.xsl` for rendering tweaks).

Because these files are part of the scaffold, they live *inside* your project and are yours to modify if you need to. See [Designing Sustainable Projects](/guide/designing-sustainable-projects#don-t-presuppose-an-environment) for the rationale.

---

## `extract-metadata.xsl`

Produces a per-document metadata XML file from one TEI/EpiDoc source document. The file it emits is the canonical intermediate artefact consumed by `create-11ty-data.xsl`, `aggregate-indices.xsl`, and `aggregate-search-data.xsl`.

For each configured language, it invokes three hook templates that live in your project's `metadata-config.xsl`, then stamps `xml:lang` onto their output and merges entities with the same `@xml:id` across languages into unified elements.

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `source-file` | `base-uri()` | Path/URI of the source document (used to derive `documentId`) |
| `languages` | `'en'` | Space-separated list of language codes |

### Hooks (in `metadata-config.xsl`)

| Mode | Purpose |
|------|---------|
| `extract-metadata` | Page display fields (title, sortKey, dates, etc.) |
| `extract-all-entities` | `<entity indexType="...">` elements for indices |
| `extract-search` | Search facet data. Multi-valued fields emitted as `<item>` children are deduplicated automatically, per document and per language |

All hooks receive a `$language` tunnel parameter.

### Input / Output

Input: a TEI/EpiDoc XML document.

Output (abbreviated):

```xml
<metadata>
  <documentId>Feind_Kr1</documentId>
  <sourceFile>Feind_Kr1.xml</sourceFile>
  <page>
    <title xml:lang="en">Kephalas, dignitary...</title>
    <title xml:lang="de">Kephalas, Würdenträger...</title>
    <sortKey xml:lang="en">kephalas...</sortKey>
  </page>
  <entities>
    <persons>
      <entity xml:id="p01" indexType="persons">
        <name xml:lang="en">Kephalas</name>
        <name xml:lang="de">Kephalas</name>
      </entity>
    </persons>
  </entities>
  <search>
    <centuries xml:lang="en"><item>8</item></centuries>
    <places xml:lang="en"><item>Kephalonia</item></places>
  </search>
</metadata>
```

---

## `create-11ty-data.xsl`

Converts one metadata XML into a `.11tydata.json` sidecar file that Eleventy reads alongside the corresponding HTML fragment. The sidecar tells Eleventy which layout to use, what collection tags to assign, and what fields to expose to templates.

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `layout` | `''` | Eleventy layout name (e.g. `document.njk`) |
| `tags` | `''` | Eleventy collection tags (e.g. `seals`) |
| `language` | `'en'` | Language to select from `/metadata/page/*[@xml:lang]` |

### Input / Output

Input: one metadata XML file (output of `extract-metadata.xsl`).

Output (abbreviated):

```json
{
  "layout": "document.njk",
  "tags": "seals",
  "documentId": "Feind_Kr1",
  "title": "Kephalas, dignitary...",
  "sortKey": "kephalas..."
}
```

All `/metadata/page/*` elements matching the requested language are flattened into top-level keys. Elements with child elements (e.g. `<textType><item>…</item><item>…</item></textType>`) become JSON arrays.

---

## `aggregate-indices.xsl`

Reads per-document metadata XML files from a whole collection and produces one JSON file per index type (e.g. `persons.json`, `places.json`) plus a `_summary.json` describing all indices. Driven by `<idx:index>` configuration in `metadata-config.xsl`.

Entities with the same `@xml:id` are merged into one index entry (the entry's `references` array records each document the entity appears in). Entities without `@xml:id` are unique per occurrence.

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `metadata-files` | — | Space-separated absolute paths to metadata XML files |
| `metadata-config` | — | Absolute path to `metadata-config.xsl` (for reading `<idx:index>` declarations) |

### Multilingual handling

Fields with `@xml:lang` produce language-keyed JSON objects, `{"en": "…", "de": "…"}`. Fields without `@xml:lang` produce plain strings.

### Input / Output

Input: multiple metadata XML files (via `metadata-files`) and the project's `metadata-config.xsl` (via `metadata-config`).

Principal output (`_summary.json`):

```json
{
  "indices": [
    { "id": "persons", "title": {"en": "Persons", "de": "Personen"},
      "description": {"en": "All persons in the corpus."},
      "order": 1, "nav": "indices", "entryCount": 145 }
  ]
}
```

Per-index result documents (e.g. `persons.json`):

```json
{
  "id": "persons",
  "title": {"en": "Persons"},
  "columns": [
    { "key": "name", "header": {"en": "Name"} }
  ],
  "entries": [
    {
      "name": {"en": "Kephalas"},
      "sortKey": "kephalas",
      "references": [
        { "documentId": "Feind_Kr1", "name": {"en": "Kephalas"} }
      ]
    }
  ]
}
```

---

## `aggregate-search-data.xsl`

Reads per-document metadata XML files and emits a JSON array of search documents for one language, consumed by the client-side `efes-search` component (which builds a FlexSearch index and computes facet counts from it at page load).

For a multi-language project, run one pipeline node per language with a different `$language` parameter and a different output filename (e.g. `documents_en.json`, `documents_de.json`).

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `metadata-files` | — | Space-separated absolute paths to metadata XML files |
| `language` | first available | Language code to extract |

### Input / Output

Input: multiple metadata XML files.

Output (abbreviated):

```json
[
  { "documentId": "Feind_Kr1",
    "centuries": ["8"],
    "places": ["Kephalonia"],
    "title": "Kephalas, dignitary..." },
  { "documentId": "Feind_Kr2", "... ": "..." }
]
```

Multi-valued fields (those emitted as `<item>` children by the `extract-search` hook) become JSON arrays. Scalar fields become strings.

---

## `prune-to-language.xsl`

Strips elements with an `xml:lang` attribute that doesn't match the target language, leaving a mono-lingual TEI document. Used as a preprocessing step when the source XML encodes multiple language variants and the downstream rendering or aggregation only expects one.

Identity-transform at heart; the only rules are:

- Remove `*[@xml:lang != $language]`
- Preserve `tei:foreign` (language-tagged but shouldn't be pruned)
- Preserve `tei:div[@type='edition']`, its `textpart` and `ab` descendants, and `tei:div[@type='translation']` (they carry their own language semantics handled by the EpiDoc stylesheets)

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `language` | — | Target language code (e.g. `en`, `de`, `el`) |

### Input / Output

Input: a multilingual TEI/EpiDoc document.

Output: the same document with non-matching-language material removed.

---

## `epidoc-to-html.xsl`

Thin wrapper around the upstream EpiDoc (or SigiDoc) stylesheets' `start-edition.xsl`. Gives the pipeline a single entry point for rendering a source document to an HTML fragment, with project-specific parameter wiring and an optional i18n substitution pass.

This is the one library stylesheet most likely to need editing, because it scaffolds the *import path* for the upstream stylesheets and the *name of the body-structure template* (`sigidoc-body-structure` or `inslib-body-structure`) based on the stylesheet flavour chosen at project-creation time. If you switch flavours, or add custom rendering params, adjust this file (and `overrides.xsl`, which it also imports).

### Parameters

Pipeline wires values through for these tunnel parameters:

| Group | Parameters |
|-------|-----------|
| EpiDoc rendering | `edn-structure`, `edition-type`, `external-app-style`, `internal-app-style`, `leiden-style`, `line-inc`, `verse-lines`, `hgv-gloss`, `css-loc`, `image-loc` |
| Bibliography | `bib`, `bibloc`, `bib-link-template` |
| Authority files | `authority-dir`, `symbols-file`, `places-file`, `institutions-file` |
| Glyphs | `glyph-variant` |
| i18n | `language`, `messages-file` |

When `language` (or `messages-file`) is set, the stylesheet loads `../../translations/messages_{language}.xml` and replaces every `<i18n:text i18n:key="…"/>` in the rendered output with the corresponding translation. Unknown keys render as `[key]` so missing translations are visible, not silent.

### Input / Output

Input: a TEI/EpiDoc or SigiDoc XML document.

Output: an HTML fragment (rendered transcription, metadata, commentary), ready for assembly into a full page by Eleventy.
