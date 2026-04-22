# CLI Reference

The EFES-NG CLI provides commands for building and managing projects.

## Installation

> [!info] Not on npm yet
> EFES-NG is not yet published on npm. See the [README](https://github.com/olvidalo/efes-ng-prototype#building-from-source) for build-from-source instructions.

Once published, install globally:

```bash
npm install -g @efes-ng/core
```

Then run commands from your project directory:

```bash
efes-ng <command>
```

## Commands

### `run`

Execute the pipeline once.

```bash
efes-ng run [--project <dir>]
```

| Option | Description |
|--------|-------------|
| `--project <dir>` | Project directory (default: current directory) |

### `watch`

Start watch mode which rebuilds affected nodes when source files change.

```bash
efes-ng watch [--project <dir>]
```

### `clean`

Remove all generated files and caches.

```bash
efes-ng clean [--project <dir>]
```

Deletes: `_assembly/`, `_output/`, `.efes-build/`, `.efes-cache/`

### `status`

Display pipeline information: node names, dependencies, cache state.

```bash
efes-ng status [--project <dir>]
```
