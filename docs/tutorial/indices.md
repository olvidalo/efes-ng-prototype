# Indices

The seal pages and seal list work, but the Indices section is still empty. Indices are browsable tables that collect entities — persons, places, dignities, offices — extracted from across all your documents. Let's add one.

## How Indices Work

An index configuration has three parts:

1. **Definition** — in `indices-config.xsl`, an `<idx:index>` block declares the index (its ID, title, and column layout)
2. **Extraction** — an XSLT template finds the relevant entities in each XML source file and outputs `<entity>` elements
3. **Aggregation** — a pipeline node combines all extracted entities across documents into a single JSON file

The data flows like this:

```mermaid
flowchart LR
  config["indices-config.xsl\n(define + extract)"]
  meta(["metadata XML\nwith entities"])
  agg["Node: <b>aggregate-indices</b>"]
  json(["_data/indices/persons.json"])
  tpl["indices/persons.njk"]

  config --> meta --> agg --> json --> tpl

  style meta fill:#e8f5e9,stroke:#4caf50
  style json fill:#e8f5e9,stroke:#4caf50
```

We already have the extraction step (`extract-epidoc-metadata`) — its `<entities>` section was empty because we hadn't defined any indices yet. Let's fix that.

## Adding a Persons Index

> [!info] We're working with: XSLT Index Configuration (source/indices-config.xsl)

Open `source/indices-config.xsl`. The scaffold includes a commented-out persons index example. We'll uncomment and adapt it in three places.

### Define the Index

Find the commented-out `<idx:index id="persons">` block and uncomment it. We'll also add a surname column — the scaffold only has a generic `name` column, but our SigiDoc seals have separate forenames and surnames:

```xml
<idx:index id="persons" title="Persons" nav="indices" order="10">
    <idx:description>Persons attested in the collection.</idx:description>
    <idx:columns>
        <idx:column key="forename">Forename</idx:column>
        <idx:column key="surname">Surname</idx:column>
        <idx:column key="references" type="references">Seals</idx:column>
    </idx:columns>
</idx:index>
```

This declares an index called "Persons" with three columns. Each `<idx:column>` has a `key` attribute (matching a field name in the extracted entity data) and a text content that becomes the column header. The `type="references"` tells the template to render the column as clickable links to seal pages.

### Adapt the Extraction Template

Uncomment the `extract-persons` template below the index definition. The scaffold provides a generic version that extracts all `<tei:persName>` elements:

```xml
<!-- Scaffold default (generic) -->
<xsl:template match="tei:TEI" mode="extract-persons">
    <xsl:for-each select=".//tei:persName[normalize-space()]">
        <xsl:variable name="displayName" select="normalize-space(.)"/>
        <entity indexType="persons">
            <name><xsl:value-of select="$displayName"/></name>
            <sortKey><xsl:value-of select="lower-case($displayName)"/></sortKey>
        </entity>
    </xsl:for-each>
</xsl:template>
```

This works as a starting point, but for our SigiDoc project the person encoding is more specific — seal issuers are in `<listPerson type="issuer">` with separate forename and surname elements in multiple languages. Let's adapt it:

```xml
<!-- Adapted for SigiDoc seal issuers -->
<xsl:template match="tei:TEI" mode="extract-persons">
    <xsl:param name="language" tunnel="yes"/>
    <xsl:for-each select=".//tei:listPerson[@type='issuer']/tei:person">
        <xsl:variable name="name" select="(tei:persName[@xml:lang=$language], tei:persName)[1]"/>
        <xsl:variable name="forename" select="normalize-space($name/tei:forename)"/>
        <xsl:variable name="surname" select="normalize-space($name/tei:surname)"/>
        <xsl:if test="$forename or $surname">
            <entity indexType="persons">
                <forename><xsl:value-of select="$forename"/></forename>
                <surname><xsl:value-of select="$surname"/></surname>
                <sortKey><xsl:value-of select="lower-case(string-join(($forename, $surname), ' '))"/></sortKey>
            </entity>
        </xsl:if>
    </xsl:for-each>
</xsl:template>
```

The key differences from the scaffold version:
- We target `tei:listPerson[@type='issuer']` instead of all `tei:persName`
- We extract `forename` and `surname` as separate fields (matching our column definitions)
- `@xml:lang=$language` picks the name in the current language, falling back to any available name
- The `sortKey` combines forename and surname for alphabetical ordering

Each `<entity>` must have:
- **`indexType`** matching the index ID (`"persons"`)
- **Fields matching the column keys** — here `forename` and `surname`
- **`sortKey`** for ordering

The framework automatically groups entities across all documents and collects references to the documents they appear in.

### Register the Extraction

Find the `extract-all-entities` template and uncomment the `apply-templates` line:

```xml
<xsl:template match="tei:TEI" mode="extract-all-entities">
    <xsl:apply-templates select="." mode="extract-persons"/>
</xsl:template>
```

This tells the metadata extraction to run your persons template for each document. When you add more indices later, you add more `apply-templates` lines here.

### Verify the Extraction

Rebuild and inspect a metadata XML file (click the **folder icon** next to `extract-epidoc-metadata`). The `<entities>` section that was empty before should now contain person data:

```xml
<entities xml:lang="en">
    <persons>
        <entity indexType="persons">
            <forename>Manouel</forename>
            <surname>Mandromenos</surname>
            <sortKey>manouel mandromenos</sortKey>
        </entity>
    </persons>
</entities>
```

## Adding the Aggregation Node

> [!info] We're switching to: Pipeline Configuration (pipeline.xml)

The extraction produces per-document entity data, but the index page needs all persons combined into one table. The `aggregate-indices` node does this.

Uncomment it in `pipeline.xml`:

```xml
<xsltTransform name="aggregate-indices">
    <stylesheet>
        <files>source/stylesheets/lib/aggregate-indices.xsl</files>
    </stylesheet>
    <initialTemplate>aggregate</initialTemplate>
    <stylesheetParams>
        <param name="metadata-files">
            <from node="extract-epidoc-metadata" output="transformed"/>
        </param>
        <param name="indices-config">
            <files>source/indices-config.xsl</files>
        </param>
    </stylesheetParams>
    <output to="_assembly/_data/indices" filename="_summary.json"/>
</xsltTransform>
```

This node is different from the ones we've seen before:

- **`metadata-files`** — passes all the metadata XML files from `extract-epidoc-metadata` as a parameter to the stylesheet. This is how the aggregation gets access to entity data from every document at once
- **`indices-config`** — passes your `indices-config.xsl` so the aggregation knows which indices are defined and how their columns are structured
- **`<initialTemplate>`** — instead of processing input files one by one, this node calls a named template (`aggregate`) that processes all metadata files at once to produce combined output
- **`<output filename="_summary.json">`** — produces a single file rather than one per input. The aggregation stylesheet also produces individual JSON files for each index (e.g., `persons.json`) alongside the summary

### How Does Eleventy Know to Wait?

You might wonder: we didn't add a `<from>` dependency between `aggregate-indices` and `eleventy-build`. How does the Eleventy build know to wait for the index data?

Look at the `eleventyBuild` node's configuration:

```xml
<eleventyBuild name="eleventy-build">
    <sourceDir><collect>_assembly</collect></sourceDir>
    ...
</eleventyBuild>
```

Back in [Exploring the Project](./explore-project), we mentioned that `<collect>` would be explained later — here's how it works. The `<collect>` element creates an implicit dependency on *all* nodes that write files into the specified directory. Since `aggregate-indices` writes to `_assembly/_data/indices/`, and `transform-epidoc` writes to `_assembly/en/seals/`, and `copy-eleventy-site` writes to `_assembly/` — this single `<collect>` ensures the Eleventy build waits for all of them to finish, without you having to list every dependency explicitly.

### Inspecting the Aggregated Data

Rebuild and open the output directory for `aggregate-indices` (click the **folder icon**). You'll find two kinds of files:

**`_summary.json`** — a list of all defined indices with entry counts:

```json
{
  "indices": [
    {
      "id": "persons",
      "title": "Persons",
      "description": "Persons attested in the collection.",
      "entryCount": 69
    }
  ]
}
```

The indices landing page (`en/indices/index.njk`) reads this file to show an overview card for each index.

**`persons.json`** — the full data for the persons index. You might wonder how this file got here — the pipeline only specifies `_summary.json` as the output filename. The aggregation stylesheet uses an XSLT feature called `xsl:result-document` to write additional files alongside the primary output. For each index it defines, it produces a separate JSON file. The file names are derived from the index IDs in your `indices-config.xsl`.

Here's what `persons.json` looks like:

```json
{
  "id": "persons",
  "title": "Persons",
  "columns": [
    { "key": "forename", "header": "Forename" },
    { "key": "surname", "header": "Surname" },
    { "key": "references", "header": "Seals", "type": "references" }
  ],
  "entries": [
    {
      "forename": "Manouel",
      "surname": "Mandromenos",
      "sortKey": "manouel mandromenos",
      "references": [
        { "inscriptionId": "Feind_Kr12" }
      ]
    }
  ]
}
```

Notice how the aggregation grouped all occurrences of each person across documents and collected the references. The column definitions come from the `<idx:index>` block you defined — they tell the template how to render the table.

::: details How does Eleventy make this data available?
Eleventy has a special convention: any JSON file in a `_data/` directory is automatically loaded and made available to templates. The directory structure becomes the property path — files in `_data/indices/` become properties of `indices`. So `_data/indices/persons.json` is available as `indices.persons`, and `_data/indices/_summary.json` as `indices._summary`. That's why the index page template can simply write `{% set indexData = indices.persons %}` — no configuration needed.
:::

## Creating the Index Page

> [!info] We're switching to: Website Templates (source/website/)

The indices landing page (`en/indices/index.njk`) already exists and will automatically show your new index as a card. But we need a page to display the actual persons table.

The scaffold includes an example template for this. Rename `source/website/en/indices/persons.njk.example` to `persons.njk`, then update the `documentBasePath` to point to our seals:

```html
---
layout: layouts/base.njk
title: Persons
---

{% set documentBasePath = "/en/seals" %}
{% set indexData = indices.persons %}
{% include "partials/index-table.njk" %}
```

The template is short because the heavy lifting is done by the shared `index-table.njk` partial. It reads the `persons.json` data and renders the table with the columns we defined in the index definition.

The `documentBasePath` variable tells the template where your seal pages live — so the reference links point to the right URLs (e.g., `/en/seals/Feind_Kr1/`).

## See It Work

Rebuild and navigate to the Indices page. You should see a "Persons" card with an entry count. Click it to see the full table — person names with links to the seals they appear on.

> [!tip] Adding More Indices
> To add another index (places, dignities, offices, etc.), repeat the pattern:
> 1. Add an `<idx:index>` definition in `indices-config.xsl`
> 2. Add an extraction template (`mode="extract-yourindex"`)
> 3. Register it in `extract-all-entities`
> 4. Create a page template (`en/indices/yourindex.njk`)
>
> The SigiDoc FEIND project has complete examples with five indices — see its `indices-config.xsl` for reference.

## Advanced: Showing Greek Names

The persons index shows transliterated names ("Manouel Mandromenos"), but the SigiDoc XML also has the original Greek. Let's add a column for it.

First, add the column to the index definition in `indices-config.xsl`:

```xml
<idx:index id="persons" title="Persons" nav="indices" order="10">
    <idx:description>Persons attested in the collection.</idx:description>
    <idx:columns>
        <idx:column key="forename">Forename</idx:column>
        <idx:column key="surname">Surname</idx:column>
        <idx:column key="greekName">Greek</idx:column>
        <idx:column key="references" type="references">Seals</idx:column>
    </idx:columns>
</idx:index>
```

Then add the field to the extraction template — the Greek name is in `tei:persName[@xml:lang='grc']`:

```xml
<xsl:variable name="greekName" select="normalize-space(
    string-join((tei:persName[@xml:lang='grc']/tei:forename,
                 tei:persName[@xml:lang='grc']/tei:surname), ' ')
)"/>
<entity indexType="persons">
    <forename><xsl:value-of select="$forename"/></forename>
    <surname><xsl:value-of select="$surname"/></surname>
    <greekName><xsl:value-of select="$greekName"/></greekName>
    <sortKey><xsl:value-of select="lower-case(string-join(($forename, $surname), ' '))"/></sortKey>
</entity>
```

Rebuild — the persons table now shows three columns: Forename, Surname, and Greek. For "Manouel Mandromenos," the Greek column shows "Μανουήλ Μανδρομηνοός."

Note that `@xml:lang='grc'` is hardcoded — Greek names are a scholarly convention, not a UI language preference. They should always show the original script regardless of the site language.

## What We've Built So Far

```mermaid
flowchart TD
  seals[/"source/seals/Feind_*.xml"/]
  templates[/"source/website/"/]

  prune["Node: <b>prune-epidoc-english</b>"]
  transform["Node: <b>transform-epidoc</b>"]
  extract["Node: <b>extract-epidoc-metadata</b>"]
  data["Node: <b>generate-eleventy-data</b>"]
  agg["Node: <b>aggregate-indices</b>"]
  copy["Node: <b>copy-eleventy-site</b>"]
  build["Node: <b>eleventy-build</b>"]

  pruned(["English-only SigiDoc XML"])
  html(["Feind_*.html"])
  meta(["metadata XML"])
  json(["Feind_*.11tydata.json"])
  idxjson(["_data/indices/*.json"])
  site(["templates, CSS, ..."])
  output(["_output/"])

  seals --> prune --> pruned
  seals --> extract --> meta
  pruned --> transform --> html
  meta --> data --> json
  meta --> agg --> idxjson
  templates --> copy --> site

  html --> build
  json --> build
  idxjson --> build
  site --> build
  build --> output

  style seals fill:#f5f5f5,stroke:#999
  style templates fill:#f5f5f5,stroke:#999
  style pruned fill:#e8f5e9,stroke:#4caf50
  style html fill:#e8f5e9,stroke:#4caf50
  style meta fill:#e8f5e9,stroke:#4caf50
  style json fill:#e8f5e9,stroke:#4caf50
  style idxjson fill:#e8f5e9,stroke:#4caf50
  style site fill:#e8f5e9,stroke:#4caf50
  style output fill:#fff3e0,stroke:#ff9800
  style agg stroke:#2563eb,stroke-width:3px
  style idxjson stroke:#2563eb,stroke-width:2px
```

The `aggregate-indices` node (highlighted in blue) is new in this step. It reads the metadata we already extract and produces index JSON files that Eleventy renders as browsable tables.

Next, let's make the content searchable — [Search →](./search)
