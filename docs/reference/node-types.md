# Node Types

## `<xsltTransform>`

Applies an XSLT 3.0 stylesheet to XML source files using Saxon-JS.

```xml
<xsltTransform name="transform-inscriptions">
  <sourceFiles><files>source/inscriptions/*.xml</files></sourceFiles>
  <stylesheet><files>source/stylesheets/epidoc-to-html.xsl</files></stylesheet>
  <stylesheetParams>
    <param name="edition-type">interpretive</param>
    <param name="leiden-style">panciera</param>
    <param name="bibloc"><files>source/authority/bibliography.xml</files></param>
  </stylesheetParams>
  <initialTemplate>main</initialTemplate>
  <output to="_assembly/en/inscriptions" extension=".html"/>
</xsltTransform>
```

| Element | Required | Description |
|---------|----------|-------------|
| `<sourceFiles>` | No | Input XML documents (glob or node reference). Omit when using `<initialTemplate>` |
| `<stylesheet>` | Yes | XSLT stylesheet to apply |
| `<stylesheetParams>` | No | Parameters passed to the stylesheet |
| `<initialTemplate>` | No | Named template to invoke (instead of default matching) |
| `<output>` | No | Output configuration |

Stylesheet parameters can reference files, directories, or other node outputs:

```xml
<stylesheetParams>
  <param name="plain-value">some string</param>
  <param name="file-ref"><files>source/authority/places.xml</files></param>
  <param name="dir-ref"><dir>source/authority</dir></param>
  <param name="node-ref"><from node="other-node" output="transformed"/></param>
</stylesheetParams>
```

> [!info]
> XSLT stylesheets are automatically compiled to SEF (Saxon Executable Format) before transformation. You don't need a separate compilation step.

### Result Documents

If the XSLT stylesheet uses `xsl:result-document` to produce additional output files, these are written relative to the node's output directory (as specified by `<output to="...">`). For example, if the output is configured as `<output to="_assembly/_data/indices" filename="_summary.json"/>` and the stylesheet writes `<xsl:result-document href="persons.json">`, the file will appear at `_assembly/_data/indices/persons.json`.

Result documents are tracked by the pipeline and available as a separate output key (`result-documents`) for downstream nodes.

## `<copyFiles>`

Copies files from source to the output directory.

```xml
<copyFiles name="copy-website">
  <sourceFiles><files>source/website/**/*</files></sourceFiles>
  <output to="_assembly" stripPrefix="source/website"/>
</copyFiles>
```

| Element | Required | Description |
|---------|----------|-------------|
| `<sourceFiles>` | Yes | Files to copy (glob pattern) |
| `<output>` | No | Output configuration |

## `<eleventyBuild>`

Runs an [Eleventy](https://www.11ty.dev/) build on the assembled site.

```xml
<eleventyBuild name="eleventy-build">
  <sourceDir><collect>_assembly</collect></sourceDir>
  <passthroughCopy>
    <param name="search-data">search-data</param>
    <param name="assets">assets</param>
  </passthroughCopy>
  <output to="_output"/>
</eleventyBuild>
```

| Element | Required | Description |
|---------|----------|-------------|
| `<sourceDir>` | Yes | Assembled site directory (typically via `<collect>`) |
| `<passthroughCopy>` | No | Directories to pass through without Eleventy processing |
| `<output>` | Yes | Final site output directory |

## `<zipCompress>`

Creates a ZIP archive from input files.

```xml
<zipCompress name="archive">
  <sourceFiles><from node="transform" output="transformed"/></sourceFiles>
  <output filename="results.zip"/>
</zipCompress>
```
