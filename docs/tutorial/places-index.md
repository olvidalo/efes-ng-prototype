# Authority Files and Places Index

The persons index extracts names directly from each seal's XML. But place names work differently — the seal XML contains a reference (`@ref="#geo0054"`), and the actual name lives in an authority file (`geography.xml`), along with translations. In the following, we build a places index that looks up names from the authority file, with multilingual support.

## What Are Authority Files?

Authority files are shared XML databases of controlled vocabulary — standardised entries for places, persons, dignities, etc. Each entry has an ID and names in multiple languages:

```xml
<!-- source/authority/geography.xml -->
<place xml:id="geo0054">
    <placeName xml:lang="en">Cephalonia</placeName>
    <placeName xml:lang="de">Kephalonia</placeName>
    <placeName xml:lang="el">Κεφαλληνία</placeName>
    <placeName xml:lang="grc">Κεφαλληνία</placeName>
</place>
```

The seal XML references this entry:

```xml
<placeName ref="#geo0054">Cephalonia</placeName>
```

For the index, we will use an extraction template that resolves the reference and picks the name in the current language.

### Getting the Authority Files

In SigiDoc, authority files are maintained per-project. For this tutorial, we use existing authority files for the Robert Feind Collection that are maintained in [their own GitHub repository](https://github.com/byzantinistik-koeln/authority) .

Create a new directory for authority files `source/authority` and download `geography.xml` into it. 

::: tip If you are using `git`, you could add `https://github.com/byzantinistik-koeln/authority` as a submodule of your project repository under `source/authority`.
:::


## Adding the Authority File as a Dependency

> [!info] We're working with: Pipeline Configuration (pipeline.xml)

> [!warning]
> Make sure you've downloaded `geography.xml` to `source/authority/` before making this change. If the file doesn't exist when the pipeline runs, you'll get an error. If the watcher is running and you see this error, stop the pipeline and restart it after adding the file.

The extraction node needs access to the geography authority file. Add it as a stylesheet parameter so the pipeline tracks it as a dependency:

```xml
<xsltTransform name="extract-epidoc-metadata">
    <sourceFiles><files>source/seals/*.xml</files></sourceFiles>
    <stylesheet><files>source/indices-config.xsl</files></stylesheet>
    <stylesheetParams>
        <param name="languages">en de</param>
        <param name="geography-file">
            <files>source/authority/geography.xml</files>
        </param>
    </stylesheetParams>
</xsltTransform>
```

Wrapping the path in `<files>` registers it as a tracked dependency: If you update `geography.xml`, all affected seals are re-extracted.

## Defining the Places Index

> [!info] We're switching to: XSLT Configuration (source/indices-config.xsl)

In `indices-config.xsl`, add a parameter declaration so we can access the `geography-file` parameter we added to the pipeline config, and load the authority file. At the top of the `<xsl:stylesheet>` element, after this line:

```xml
<xsl:import href="stylesheets/lib/extract-metadata.xsl"/>
```

Add the following:
```xml
<xsl:param name="geography-file" as="xs:string"/>
<xsl:variable name="geography" select="document('file://' || $geography-file)"/>
```

This will store the content of the geography authority file in the `$geography` variable. 

Then define the index, at the end of the `INDEX DEFINITIONS` section:
```xml
<idx:index id="places" title="Place Names" nav="indices" order="20">
    <idx:description>Place names attested on seals.</idx:description>
    <idx:columns>
        <idx:column key="name">Name</idx:column>
        <idx:column key="references" type="references">Seals</idx:column>
    </idx:columns>
</idx:index>
```

## Writing the Extraction Template

The extraction template finds place references in each seal, resolves them via the authority file, and picks the name in the current language:

```xml
<xsl:template match="tei:TEI" mode="extract-places">
    <xsl:param name="language" tunnel="yes"/>
    <xsl:for-each select=".//tei:div[@type='textpart']//tei:placeName[starts-with(@ref, '#geo')]">
        <xsl:variable name="geo-id" select="substring-after(@ref, '#')"/>
        <xsl:variable name="place" select="$geography//tei:place[@xml:id = $geo-id]"/>
        <xsl:variable name="displayName" select="normalize-space(
            ($place/tei:placeName[@xml:lang=$language],
             $place/tei:placeName[@xml:lang='en'],
             $place/tei:placeName)[1]
        )"/>
        <xsl:if test="string-length($displayName) > 0">
            <entity indexType="places" xml:id="{$geo-id}">
                <name><xsl:value-of select="$displayName"/></name>
                <sortKey><xsl:value-of select="lower-case($displayName)"/></sortKey>
            </entity>
        </xsl:if>
    </xsl:for-each>
</xsl:template>
```

Add this template below the index definition we added above. Notice:
- The framework calls this template once per configured language, passing the current language as `$language` (a **tunnel param** — it flows automatically through intermediate templates like `extract-all-entities`)
- We use a **fallback chain** for missing translations: `@xml:lang=$language` → English (`@xml:lang='en'`) → first available
- We use an **authority lookup**: `$geography//tei:place[@xml:id = $geo-id]` resolves the reference
- **`xml:id="{$geo-id}"`** tells the framework to merge the same place across documents into one index entry. Without it, each occurrence would be a separate entry

Register it in `extract-all-entities`:

```xml
<xsl:template match="tei:TEI" mode="extract-all-entities">
    <xsl:apply-templates select="." mode="extract-persons"/>
    <xsl:apply-templates select="." mode="extract-places"/>
</xsl:template>
```

## The Multilingual Result

Because the framework calls the extraction template once per language, the metadata XML contains language-specific place names. The framework auto-stamps `xml:lang` on your output and merges entities with the same `xml:id`:

```xml
<entities>
    <places>
        <entity indexType="places" xml:id="geo0054">
            <name xml:lang="en">Cephalonia</name>
            <sortKey xml:lang="en">cephalonia</sortKey>
            <name xml:lang="de">Kephalonien</name>
            <sortKey xml:lang="de">kephalonien</sortKey>
        </entity>
    </places>
</entities>
```

The same seal's place reference resolves to "Cephalonia" in English and "Kephalonien" in German — automatically, from the same extraction template. The `xml:id="geo0054"` ensures both language variants are merged into one index entry.

## Creating the Index Page

If you're using pagination (as introduced in [Concept: Template Pagination](./multi-language#concept-template-pagination)), create `source/website/index-places.njk`:

```yaml
---
layout: layouts/base.njk
permalink: "{{ langCode }}/indices/places/index.html"
pagination:
    data: languages.codes
    size: 1
    alias: langCode
eleventyComputed:
    title: "{{ 'places' | t }}"
---
```
```liquid
{% set documentBasePath = "/" + page.lang + "/seals" %}
{% set indexData = indices.places %}
{% include "partials/index-table.njk" %}
```

If you're using the copy approach instead, create `source/website/en/indices/places.njk` (e. g. by copying from the existing persons index, and `de/indices/places.njk` for German) with the appropriate title.
 
## See It Work

Rebuild and navigate to the Indices page — you should see a "Place Names" card alongside "Persons." Click it to see place names extracted from the seals, with links to the seal pages where each place appears.

### Multilingual Index Display

Because the extraction runs once per language (via the `$languages` parameter), the aggregated index JSON contains language-keyed values:

```json
{
    "name": {"en": "Cephalonia", "de": "Kephalonia"},
    "sortKey": {"en": "geo0054", "de": "geo0054"},
    "references": [{"inscriptionId": "Feind_Kr1"}]
}
```

The index table template automatically resolves the current language — on the English page you see "Cephalonia", on the German page "Kephalonia". This happens because the `index-table.njk` partial uses `entry[col.key][page.lang]` with a fallback to English.

## Linking to External Gazetteers

Some places in the authority file have external identifiers linking to gazetteers like [Pleiades](https://pleiades.stoa.org/), [GeoNames](https://www.geonames.org/), or [TIB](https://tib.oeaw.ac.at/) (Tabula Imperii Byzantini). The authority file pairs each identifier with an explicit link:

```xml
<!-- source/authority/geography.xml -->
<place xml:id="geo0053">
    <placeName xml:lang="en">Eumeneia</placeName>
    <placeName xml:lang="de">Eumeneia</placeName>
    ...
    <idno type="pleiades">481818</idno>
    <link target="https://pleiades.stoa.org/places/481818"/>
    <idno type="geonames">311141</idno>
    <link target="https://www.geonames.org/311141/isikli.html"/>
    <idno type="TIB">7, Eumeneia</idno>
    <link target="https://tib.oeaw.ac.at/static/reader/TIB/tib7.html#page/251/mode/1up"/>
</place>
```

Let's add clickable links to these gazetteers in the places index.

### Pleiades

Add a column to the index definition with `type="link"`:

```xml
<idx:column key="pleiades" type="link">Pleiades</idx:column>
```

Then extract the Pleiades link in the extraction template. Instead of a plain text value, output a **structured field** with `<url>` and `<label>` child elements:

```xml
<xsl:variable name="pleiades-id" select="string($place/tei:idno[@type='pleiades'])"/>
...
<xsl:if test="$pleiades-id != ''">
    <pleiades>
        <url><xsl:value-of select="concat('https://pleiades.stoa.org/places/', $pleiades-id)"/></url>
        <label><xsl:value-of select="$pleiades-id"/></label>
    </pleiades>
</xsl:if>
```

When the aggregation stylesheet encounters a field with child elements (instead of just text), it serializes them as a JSON object. The `index-table.njk` partial recognizes `type="link"` columns and renders the `url` and `label` keys as a clickable link.

Rebuild and check the places index — Eumeneia now shows a clickable "481818" linking to its Pleiades page. Places without a Pleiades entry show "-".

Notice that Pleiades URLs follow a regular pattern (`https://pleiades.stoa.org/places/{id}`), so we construct the URL from the ID in the extraction template rather than reading the explicit `<link>` from the authority file.

### GeoNames

The same pattern works for GeoNames. Add the column:

```xml
<idx:column key="geonames" type="link">GeoNames</idx:column>
```

And the extraction (GeoNames URLs are also regular):

```xml
<xsl:variable name="geonames-id" select="string($place/tei:idno[@type='geonames'])"/>
...
<xsl:if test="$geonames-id != ''">
    <geonames>
        <url><xsl:value-of select="concat('https://www.geonames.org/', $geonames-id)"/></url>
        <label><xsl:value-of select="$geonames-id"/></label>
    </geonames>
</xsl:if>
```

### TIB

TIB (Tabula Imperii Byzantini) is different — the URLs are not regular. They point to specific pages in digitised volumes: `tib7.html#page/251/mode/1up`. We can't construct them from the ID alone.

Instead, read the explicit `<link>` from the authority file. Each `<idno>` in the authority file is followed by a `<link target="...">` sibling with the full URL:

```xml
<xsl:variable name="tib-id" select="string($place/tei:idno[@type='TIB'])"/>
<xsl:variable name="tib-url" select="string($place/tei:idno[@type='TIB']/following-sibling::tei:link[1]/@target)"/>
...
<xsl:if test="$tib-id != ''">
    <tib>
        <url><xsl:value-of select="$tib-url"/></url>
        <label><xsl:value-of select="$tib-id"/></label>
    </tib>
</xsl:if>
```

The `following-sibling::tei:link[1]/@target` picks the `<link>` element immediately after the `<idno>` — this is the convention used in the SigiDoc authority files.

Add the column:

```xml
<idx:column key="tib" type="link">TIB</idx:column>
```

### The Complete Index Definition

With all three gazetteers, the places index definition looks like this:

```xsl
<idx:index id="places" title="Place Names" nav="indices" order="20">
    <idx:description>Place names attested on seals.</idx:description>
    <idx:columns>
        <idx:column key="name">Name</idx:column>
        <idx:column key="pleiades" type="link">Pleiades</idx:column>
        <idx:column key="geonames" type="link">GeoNames</idx:column>
        <idx:column key="tib" type="link">TIB</idx:column>
        <idx:column key="references" type="references">Seals</idx:column>
    </idx:columns>
</idx:index>
```

And the full extraction template:

```xsl
<xsl:template match="tei:TEI" mode="extract-places">  
    <xsl:param name="language" tunnel="yes"/>  
    <xsl:for-each select=".//tei:div[@type='textpart']//tei:placeName[starts-with(@ref, '#geo')]">  
        <xsl:variable name="geo-id" select="substring-after(@ref, '#')"/>  
        <xsl:variable name="place" select="$geography//tei:place[@xml:id = $geo-id]"/>  
        <xsl:variable name="displayName" select="normalize-space(  
            ($place/tei:placeName[@xml:lang=$language],
            $place/tei:placeName[@xml:lang='en'],
            $place/tei:placeName)[1])"/>  
        <xsl:if test="string-length($displayName) > 0">  
            <xsl:variable name="pleiades-id" select="$place/tei:idno[@type='pleiades']"/>  
            <xsl:variable name="geonames-id" select="$place/tei:idno[@type='geonames']"/>  
            <xsl:variable name="tib-id" select="$place/tei:idno[@type='TIB']"/>  
            <xsl:variable name="tib-url" select="$place/tei:idno[@type='TIB']/following-sibling::tei:link/@target"/>  
            <entity indexType="places" xml:id="{$geo-id}">  
                <name><xsl:value-of select="$displayName"/></name>  
  
                <xsl:if test="$pleiades-id != ''">  
                    <pleiades>  
                        <url><xsl:value-of select="concat('https://pleiades.stoa.org/places/', $pleiades-id)"/></url>  
                        <label><xsl:value-of select="$pleiades-id"/></label>  
                    </pleiades>  
                </xsl:if>  
                <xsl:if test="$geonames-id != ''">  
                    <geonames>  
                        <url><xsl:value-of select="concat('https://www.geonames.org/', $geonames-id)"/></url>  
                        <label><xsl:value-of select="$geonames-id"/></label>  
                    </geonames>  
                </xsl:if>  
                <xsl:if test="$tib-id != ''">  
                    <tib>  
                        <url><xsl:value-of select="$tib-url"/></url>  
                        <label><xsl:value-of select="$tib-id"/></label>  
                    </tib>  
                </xsl:if>  
  
                <sortKey><xsl:value-of select="lower-case($displayName)"/></sortKey>  
            </entity>  
        </xsl:if>  
    </xsl:for-each>  
</xsl:template>
```

Rebuild — the places index now has clickable links to external gazetteers where available, with "-" for places without entries.
