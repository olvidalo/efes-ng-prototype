# XSLT Overrides

The starter project template (scaffold) provides a mechanism for overriding upstream EpiDoc/SigiDoc XSLT templates without modifying the upstream stylesheets directly. This lets you customise rendering behavior while keeping upstream stylesheets updatable.

## How It Works

XSLT import precedence means templates in an importing stylesheet take priority over templates in imported stylesheets. EFES-NG uses this by importing a project-level `overrides.xsl` **after** the upstream stylesheets.

```
epidoc-to-html.xsl (framework wrapper)
  └── imports upstream epidoc/start-edition.xsl
  └── imports overrides.xsl  ← your project-level overrides (higher precedence)
```

## Creating Overrides

Edit `source/stylesheets/overrides.xsl` in your project:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:t="http://www.tei-c.org/ns/1.0"
                version="3.0">

  <!-- Override: render bibliography entries inline (no list items) -->
  <xsl:template match="t:listBibl//t:bibl">
    <xsl:apply-templates/>
  </xsl:template>

</xsl:stylesheet>
```

Any templates you define here will take precedence over the upstream EpiDoc stylesheet templates.

## Guidelines

- **Keep overrides minimal**: only override what you need to change
- **Match upstream templates exactly**: use the same `match` patterns
- **Document your overrides**: add comments explaining why the override exists
- **Check after updates**: when updating upstream stylesheets, verify your overrides still apply correctly
