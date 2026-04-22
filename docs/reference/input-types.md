# Input Types

Input types define how nodes reference their source data. They are used in `<sourceFiles>`, `<stylesheet>`, `<stylesheetParams>`, and other node configuration elements.

## `<files>`

References files on disk using glob patterns or direct paths.

```xml
<files>source/inscriptions/*.xml</files>
<files>source/stylesheets/lib/epidoc-to-html.xsl</files>
```

Glob patterns follow standard syntax (`*`, `**`, `{}` alternation). Paths are relative to the project root.

> [!warning]
> `<files>` rejects directories. Use `<dir>` instead if you need to pass a directory path.

## `<from>`

References the output of another pipeline node, creating an explicit dependency.

```xml
<from node="extract-metadata" output="transformed"/>
<from node="extract-metadata" output="transformed" glob="*.xml"/>
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `node` | Yes | Name of the source node |
| `output` | Yes | Output key to reference |
| `glob` | No | Filter the referenced outputs by glob pattern |

## `<collect>`

Creates an implicit dependency on all nodes that write files into the specified directory.

```xml
<collect>_assembly</collect>
```

This is typically used by `<eleventyBuild>` to depend on everything that contributes to the assembled site.

## `<dir>`

References a directory path. The path is resolved to an absolute path and validated to exist as a directory.

```xml
<dir>source/authority</dir>
```

Use `<dir>` when a stylesheet parameter expects a directory path rather than individual files. Files within the directory are tracked for cache invalidation.

## TypeScript API

When defining pipelines in TypeScript, the equivalent helpers are:

```typescript
import { files, from, collect, dir } from '@efes-ng/core'

files('source/inscriptions/*.xml')
from('extract-metadata', 'transformed')
collect('_assembly')
dir('source/authority')
```
