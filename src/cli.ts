#!/usr/bin/env tsx
import path from 'node:path';
import fs from 'node:fs';
import { Command } from 'commander';
import { Pipeline } from './core/pipeline';
import { discoverPipelineFile } from './core/discoverPipelineFile';
import { loadPipelineFromXml } from './core/xmlPipelineLoader';

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

// --- CLI ---

const program = new Command()
    .name('efes')
    .description('EFES-NG pipeline runner')
    .version('0.1.0')
    .showHelpAfterError();

program
    .command('run')
    .description('Run the pipeline')
    .option('--project <path>', 'Project directory', '.')
    .option('--verbose', 'Show debug-level log messages')
    .option('--no-cache', 'Clear cache before running')
    .action(async (opts) => {
        const pipeline = await discoverPipeline(opts.project);
        pipeline.verbose = opts.verbose ?? false;

        if (!opts.cache) {
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
    });

program
    .command('clean')
    .description('Remove build artifacts')
    .option('--project <path>', 'Project directory', '.')
    .action(async (opts) => {
        const absDir = path.resolve(opts.project);
        const dirs = ['.efes-build', '.efes-cache', '2-intermediate', '3-output'];

        for (const dir of dirs) {
            const target = path.join(absDir, dir);
            if (fs.existsSync(target)) {
                fs.rmSync(target, { recursive: true });
                console.log(`  Removed: ${dir}`);
            }
        }
    });

program
    .command('status')
    .description('Show pipeline node graph and cache status')
    .option('--project <path>', 'Project directory', '.')
    .action(async (opts) => {
        const pipeline = await discoverPipeline(opts.project);
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
        const absDir = path.resolve(opts.project);
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
    });

program
    .command('watch')
    .description('Watch input files and rebuild on changes')
    .option('--project <path>', 'Project directory', '.')
    .option('--verbose', 'Show debug-level log messages')
    .action(async (opts) => {
        const pipeline = await discoverPipeline(opts.project);
        pipeline.verbose = opts.verbose ?? false;
        const { PipelineWatcher } = await import('./core/watcher');
        const watcher = new PipelineWatcher(pipeline);
        await watcher.start();
    });

program
    .command('nodes')
    .description('List available node types and their configuration')
    .argument('[node-type]', 'Show details for a specific node type')
    .action(async (nodeType?: string) => {
        // Side-effect import registers all built-in nodes
        await import('./core/builtinNodes');
        const { NodeRegistry } = await import('./core/nodeRegistry');

        if (!nodeType) {
            console.log('Available node types:\n');
            for (const [name, node] of NodeRegistry.all()) {
                console.log(`  ${name}`);
                if (node.description) console.log(`    ${node.description}`);
            }
            console.log(`\nRun 'efes nodes <type>' for details.`);
            return;
        }

        const node = NodeRegistry.get(nodeType);
        if (!node) {
            console.error(`Unknown node type "${nodeType}". Available: ${NodeRegistry.names().join(', ')}`);
            process.exit(1);
        }

        console.log(`${nodeType}`);
        if (node.description) console.log(`  ${node.description}\n`);

        const schema = node.configSchema;
        const fields = Object.entries(schema);
        if (fields.length) {
            console.log('Inputs / config:');
            for (const [name, field] of fields) {
                const opt = field.optional ? ' (optional)' : '';
                const desc = field.description ? ` — ${field.description}` : '';
                console.log(`  ${name}: ${field.type}${opt}${desc}`);
            }
        }

        console.log(`\nOutputs: ${[...node.outputKeys].join(', ')}`);
    });

program
    .command('schema')
    .description('Print RELAX NG schema for pipeline XML format')
    .action(() => {
        const { generateRngSchema } = require('./core/rngSchemaGenerator');
        console.log(generateRngSchema());
    });

program.parseAsync();
