# Bibliography

Individual seal pages already show bibliography references (remember the `bib-link-template` parameter from [Adding Content](./adding-content)?) Each reference links to a bibliography page. But those pages don't exist yet. Let's build them.

We'll create two things: a **bibliography index** (a table listing all cited works) and **detail pages** (one per work, showing which seals cite it and where).

## The Authority File

> [!info] We're working with: Source Files (source/authority/)

Like the geography authority file for places, bibliography entries live in a shared authority file. Download `bibliography.xml` from the [SigiDoc authority repository](https://github.com/byzantinistik-koeln/authority) and save it to `source/authority/bibliography.xml`.

Each entry has an ID, an abbreviated citation, and structured metadata:

```xml
<bibl type="book" xml:id="SeibtWassiliou2015">
    <bibl type="abbrev">Seibt &amp; Wassiliou-Seibt, 2015</bibl>
    <author><forename>W.</forename><surname>Seibt</surname></author>
    <author><forename>A.-K.</forename><surname>Wassiliou-Seibt</surname></author>
    <title level="m">Der byzantinische Mensch in seinem Umfeld...</title>
    <pubPlace>Hannover</pubPlace>
    <publisher>VML Vlg Marie Leidorf</publisher>
    <date>2015</date>
</bibl>
```

The seal XML references these entries by ID:

```xml
<bibl>
    <ptr target="SeibtWassiliou2015"/>, <citedRange unit="page">p. 66-7</citedRange>
</bibl>
```

## Pipeline Dependency

> [!info] We're switching to: Pipeline Configuration (pipeline.xml)

Add the bibliography file as a parameter to the `extract-epidoc-metadata` node, just like we did for the geography file:

```xml
<param name="bibliography-file">
    <files>source/authority/bibliography.xml</files>
</param>
```

> [!info] We're switching to: XSLT Configuration (source/metadata-config.xsl)

And add the parameter declaration at the top of `metadata-config.xsl` (next to the geography parameter):

```xml
<xsl:param name="bibliography-file" as="xs:string"/>
<xsl:variable name="bibliography" select="document('file://' || $bibliography-file)"/>
```

## Uncommenting the Bibliography Index

The scaffold includes a commented-out bibliography index definition and extraction template. Find them in `metadata-config.xsl` and uncomment both the `<idx:index>` block and the `extract-bibliography` template.

The index definition:

```xml
<idx:index id="bibliography" title="Bibliography" nav="bibliography" order="10">
    <idx:description>Bibliographic references cited in the seals.</idx:description>
    <idx:columns>
        <idx:column key="shortCitation">Citation</idx:column>
        <idx:column key="fullCitation">Full Citation</idx:column>
        <idx:column key="references" type="references">Seals</idx:column>
    </idx:columns>
</idx:index>
```

Notice `nav="bibliography"`: this is different from the persons and places indices which use `nav="indices"` (the default). The header navigation filters by this value: the Indices dropdown shows indices with `nav="indices"`, while Bibliography gets its own top-level menu entry. This keeps the navigation clean, since bibliography is a separate section, not nested under Indices.

The extraction template scans each seal for bibliography references, looks up the cited work in the authority file, and extracts citation data:

```xml
<xsl:template match="tei:TEI" mode="extract-bibliography">
    <xsl:for-each select=".//tei:body//tei:div//tei:bibl[tei:ptr[@target != '']]">
        <xsl:variable name="target" select="string(tei:ptr/@target)"/>
        <xsl:variable name="auth" select="$bibliography//tei:bibl[@xml:id = $target]"/>
        ...
        <entity indexType="bibliography" xml:id="{$target}">
            <bibRef><xsl:value-of select="$target"/></bibRef>
            <shortCitation>...</shortCitation>
            <fullCitation>...</fullCitation>
            <citedRange>...</citedRange>
            <sortKey>...</sortKey>
        </entity>
    </xsl:for-each>
</xsl:template>
```

A few things to notice:

- **`xml:id="{$target}"`** uses the bibliography entry's ID for cross-document merging: citations to the same work from different seals are grouped into one index entry
- **One entity per `citedRange`**: if a seal cites a work at multiple locations ("p. 66" and "no. 43"), each gets its own entity. They merge by `xml:id`, but each reference keeps its specific `citedRange`
- **Structured `fullCitation`**: instead of plain text, the template extracts author, title, place, publisher, and date as separate child elements. The aggregation serializes these as a JSON object, and the bibliography template renders them with formatting (italic titles, etc.)

Also uncomment the `extract-bibliography` call in `extract-all-entities`:

```xml
<xsl:template match="tei:TEI" mode="extract-all-entities">
    <xsl:apply-templates select="." mode="extract-persons"/>
    <xsl:apply-templates select="." mode="extract-places"/>
    <xsl:apply-templates select="." mode="extract-bibliography"/>
</xsl:template>
```

## The Bibliography Pages

The scaffold already includes the bibliography website templates, so there is no need to create them. Here's what's there:

**`source/website/bibliography.njk`**: the list page, paginated by language (same pattern as the seal list). Shows a table with short citation (linked to detail page) and formatted full citation.

**`source/website/bibliography/item.njk`** and **`item.11tydata.js`**: the detail pages. One page per bibliography entry per language. Shows the full citation and a table of citing seals with their cited ranges.

Rebuild and navigate to the Bibliography page. You should see a table of all cited works. Click any entry to see its detail page: the full citation and which seals cite it, with specific page/section references.

## Cross-Referencing

The bibliography is now fully cross-referenced:

1. A **seal page** (e.g., `/en/seals/Feind_Kr3/`) shows bibliography references with links to the bibliography detail pages
2. A **bibliography detail page** (e.g., `/en/bibliography/SeibtWassiliou2015/`) shows the full citation and links back to the citing seals
3. The **bibliography list** (at `/en/bibliography/`) lets readers browse all cited works

Navigate a complete circle: open a seal → click a bibliography link → see which other seals cite the same work → click one → you're on a different seal page.

::: details Technical aside: How the detail pages work
The bibliography detail pages use a more advanced Eleventy pagination pattern than the ones we've seen so far. The seal list paginates over `languages.codes` (one page per language). The bibliography detail pages need one page per entry *per* language.

The `item.11tydata.js` file creates this cross-product:

```javascript
module.exports = {
    pagination: {
        data: "indices.bibliography.entries",
        size: 1,
        alias: "item",
        before(entries, fullData) {
            const langs = fullData.languages?.codes || ['en'];
            return entries.flatMap(entry =>
                langs.map(lang => ({ lang, ...entry }))
            );
        }
    }
};
```

The `before` callback runs before pagination: it takes the 100 bibliography entries and expands them into 200 items (100 entries x 2 languages). Each item carries a `lang` property that the template uses for the permalink and language-specific rendering.

The template (`item.njk`) uses this to generate the right URL:

```yaml
permalink: "{{ item.lang }}/bibliography/{{ item.bibRef[item.lang] }}/index.html"
```

This is a data-driven version of the language pagination pattern: instead of paginating over a fixed list of language codes, it paginates over a dynamic list of data entries, multiplied by languages.
:::

## What We've Built

The complete pipeline now looks like this:

```mermaid
flowchart TD
    seals[/"source/seals/Feind_*.xml"/]

    prune_en["prune-epidoc-english"]
    prune_de["prune-epidoc-german"]
    extract["extract-epidoc-metadata\n(languages: en de)"]

    subgraph "English"
        transform_en["transform-epidoc"]
        data_en["generate-eleventy-data"]
        search_en["aggregate-search-data"]
    end

    subgraph "German"
        transform_de["transform-epidoc-german"]
        data_de["generate-eleventy-data-german"]
        search_de["aggregate-search-data-german"]
    end

    agg["aggregate-indices"]
    build["eleventy-build"]
    output(["_output/"])

    seals --> prune_en --> transform_en
    seals --> prune_de --> transform_de
    seals --> extract
    extract --> data_en
    extract --> data_de
    extract --> agg
    extract --> search_en
    extract --> search_de

    transform_en --> build
    data_en --> build
    search_en --> build
    transform_de --> build
    data_de --> build
    search_de --> build
    agg --> build
    build --> output

    style output fill:#fff3e0,stroke:#ff9800
```

One source XML file now produces:
- HTML seal pages (English + German)
- Sidecar data files (English + German)
- Person, place, and bibliography index entries
- Search data (English + German)

All connected by cross-references: seals link to bibliography, bibliography links back to seals, indices link to seals.
