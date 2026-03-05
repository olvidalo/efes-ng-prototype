#!/usr/bin/env tsx
import path from 'node:path';
import fs from 'node:fs';
import { Pipeline } from './core/pipeline';
import { discoverPipelineFile } from './core/discoverPipelineFile';
import { loadPipelineFromXml } from './core/xmlPipelineLoader';

// --- Arg parsing ---

const args = process.argv.slice(2);
const command = args[0];

function getOption(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    if (idx === -1 || idx + 1 >= args.length) return undefined;
    return args[idx + 1];
}

function hasFlag(name: string): boolean {
    return args.includes(`--${name}`) || args.includes(`--no-${name}`);
}

// --- Pipeline discovery ---

async function discoverPipeline(dir: string): Promise<Pipeline> {
    const { filePath, format } = discoverPipelineFile(dir);
    const absDir = path.resolve(dir);

    if (format === 'xml') {
        const pipeline = await loadPipelineFromXml(filePath);
        pipeline.projectDir = absDir;
        return pipeline;
    }

    const mod = await import(filePath);
    const pipeline = mod.default;

    if (!(pipeline instanceof Pipeline)) {
        throw new Error(`${path.basename(filePath)} must export default a Pipeline instance`);
    }

    pipeline.projectDir = absDir;
    return pipeline;
}

// --- Commands ---

async function runCommand(projectDir: string): Promise<void> {
    const pipeline = await discoverPipeline(projectDir);

    if (args.includes('--no-cache')) {
        const cacheDir = path.resolve(pipeline.projectDir, pipeline.cacheDir);
        if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true });
            console.log(`Cleared cache: ${pipeline.cacheDir}`);
        }
    }

    try {
        await pipeline.run();
    } finally {
        await pipeline.shutdown();
    }
}

async function cleanCommand(projectDir: string): Promise<void> {
    const absDir = path.resolve(projectDir);
    const dirs = ['.efes-build', '.efes-cache', '2-intermediate', '3-output'];

    for (const dir of dirs) {
        const target = path.join(absDir, dir);
        if (fs.existsSync(target)) {
            fs.rmSync(target, { recursive: true });
            console.log(`  Removed: ${dir}`);
        }
    }
}

async function statusCommand(projectDir: string): Promise<void> {
    const pipeline = await discoverPipeline(projectDir);
    const nodeNames = pipeline.getNodeNames();

    console.log(`Pipeline: ${pipeline.name}`);
    console.log(`Nodes: ${nodeNames.length}`);
    console.log(`Execution mode: ${pipeline.executionMode}\n`);

    for (const name of nodeNames) {
        const deps = pipeline.getDependenciesOf(name);
        const depStr = deps.length > 0 ? `  ← ${deps.join(', ')}` : '';
        console.log(`  ${name}${depStr}`);
    }

    // Cache status
    const absDir = path.resolve(projectDir);
    const cacheDir = path.join(absDir, pipeline.cacheDir);
    if (fs.existsSync(cacheDir)) {
        let entryCount = 0;
        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory()) walk(path.join(dir, entry.name));
                else if (entry.name.endsWith('.json')) entryCount++;
            }
        };
        walk(cacheDir);
        console.log(`\nCache: ${entryCount} entries`);
    } else {
        console.log('\nCache: empty');
    }

    // Output status
    const outputDir = path.join(absDir, '3-output');
    console.log(`Output: ${fs.existsSync(outputDir) ? 'built' : 'not built'}`);
}

async function watchCommand(projectDir: string): Promise<void> {
    const pipeline = await discoverPipeline(projectDir);
    const { PipelineWatcher } = await import('./core/watcher');
    const watcher = new PipelineWatcher(pipeline);
    await watcher.start();
}

function schemaCommand(): void {
    const { generateRngSchema } = require('./core/rngSchemaGenerator');
    console.log(generateRngSchema());
}

// --- Main ---

(async () => {
    const projectDir = getOption('project') || '.';

    try {
        switch (command) {
            case 'run':
                await runCommand(projectDir);
                break;
            case 'clean':
                await cleanCommand(projectDir);
                break;
            case 'status':
                await statusCommand(projectDir);
                break;
            case 'watch':
                await watchCommand(projectDir);
                break;
            case 'schema':
                schemaCommand();
                break;
            default:
                console.log(`Usage: efes <command> [options]

Commands:
  run       Run the pipeline
  clean     Remove build artifacts
  status    Show node graph and cache status
  watch     Watch inputs and rebuild on changes
  schema    Print RELAX NG schema for pipeline XML format

Options:
  --project <path>   Project directory (default: cwd)
  --no-cache         Clear cache before running
`);
                process.exit(command ? 1 : 0);
        }
    } catch (err: any) {
        console.error(`\nError: ${err.message}`);
        process.exit(1);
    }
})();
