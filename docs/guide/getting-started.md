# Getting Started

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm (included with Node.js)

## Using the Desktop Application

The easiest way to work with EFES-NG Prototype is through the desktop application. Download it for your platform, then:

1. Open the application
2. Click **Open** and select your project folder
3. Click **Start** to build and enter watch mode
4. Click **Preview** to view your site in a browser

See [Desktop Application](/guide/gui) for more details.

## Using the Command Line

Alternatively, you can use the CLI:

```bash
# Create a new project
npx create-efes-ng my-project

# Build the pipeline
cd my-project
npx efes-ng run

# Watch for changes
npx efes-ng watch

# Clean generated files
npx efes-ng clean
```

See the [CLI reference](/reference/cli) for all commands.

## Next Steps

Ready to build your first project? Follow the [Tutorial](/tutorial/) — it walks you through creating a complete SigiDoc edition from scratch.
