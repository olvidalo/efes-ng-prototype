# Getting Started

## Using the Desktop Application

The easiest way to work with the EFES-NG Prototype is through the desktop application. Download it for your platform, then:

1. Open the application
2. Click **New** to create a project, or **Open** to select an existing one
3. Click **Start** to build and enter watch mode
4. Click **Preview** to view your site in a browser

See [Desktop Application](/guide/gui) for more details.

## Using the Command Line

Alternatively, you can use the CLI. This requires [Node.js](https://nodejs.org/) 22 or later.

> [!info] Not on npm yet
> EFES-NG is not yet published on npm. See the [README](https://github.com/olvidalo/efes-ng-prototype#building-from-source) for build-from-source instructions.

```bash
# Create a new project
npx create-efes-ng my-project

# Build the pipeline
cd my-project
efes-ng run

# Watch for changes
efes-ng watch

# Clean generated files
efes-ng clean
```

See the [CLI reference](/reference/cli) for all commands.

## Next Steps

Read the other guide pages or follow the [Tutorial](/tutorial/), it walks you through creating a complete SigiDoc edition from scratch using encoded seals from an existing collection.
