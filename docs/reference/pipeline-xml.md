# Pipeline XML Reference

The pipeline definition file (`pipeline.xml`) describes the processing graph for your project.

## Root Element

```xml
<pipeline name="Project Name">
  <meta siteDir="_output"/>
  <!-- nodes -->
</pipeline>
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `name` | Yes | Display name for the pipeline |

### `<meta>`

| Attribute | Required | Description |
|-----------|----------|-------------|
| `siteDir` | Yes | Directory containing the final site output — used by the live preview server |

## Output Configuration

Most nodes accept an `<output>` element to control where results are written:

```xml
<output to="_assembly/en/inscriptions"
        stripPrefix="source/inscriptions"
        extension=".html"
        filename="result.json"/>
```

| Attribute | Description |
|-----------|-------------|
| `to` | Target directory (relative to project root) |
| `stripPrefix` | Remove this prefix from input paths when deriving output paths |
| `extension` | Change the output file extension |
| `filename` | Use a fixed output filename (for single-file outputs) |

> [!tip]
> If all consumers reference this node via `<from>`, you don't need `<output>` — the node writes to its default build directory (`.efes-build/{nodeName}/`).

## Common Patterns

### Chaining Nodes

```xml
<xsltTransform name="extract-metadata">
  <sourceFiles><files>source/inscriptions/*.xml</files></sourceFiles>
  <stylesheet><files>source/stylesheets/lib/extract-metadata.xsl</files></stylesheet>
</xsltTransform>

<xsltTransform name="generate-data">
  <sourceFiles><from node="extract-metadata" output="transformed"/></sourceFiles>
  <stylesheet><files>source/stylesheets/lib/create-11ty-data.xsl</files></stylesheet>
  <output to="_assembly/en/inscriptions" extension=".11tydata.json"/>
</xsltTransform>
```

### Collecting Into a Directory

```xml
<eleventyBuild name="eleventy-build">
  <sourceDir><collect>_assembly</collect></sourceDir>
  <output to="_output"/>
</eleventyBuild>
```

The `<collect>` input creates an implicit dependency on all nodes that write to `_assembly/`.
