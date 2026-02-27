import chokidar from 'chokidar';
import path from 'node:path';
import { Pipeline, inputIsNodeOutputReference } from './pipeline';

/**
 * Watches a pipeline's input files and triggers rebuilds on changes.
 * Uses chokidar for efficient native filesystem event monitoring.
 */
export class PipelineWatcher {
    private watcher: chokidar.FSWatcher | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private isRunning = false;
    private pendingRebuild = false;

    constructor(
        private pipeline: Pipeline,
        private debounceMs: number = 300
    ) {}

    async start(): Promise<void> {
        // Initial full build
        await this.pipeline.run();

        // Collect paths to watch from node configs
        const watchPaths = this.collectWatchPaths();

        if (watchPaths.length === 0) {
            console.log('No input paths found to watch.');
            return;
        }

        this.pipeline.emit('watch:ready', { paths: watchPaths });
        console.log(`\nWatching ${watchPaths.length} path(s) for changes:`);
        for (const p of watchPaths) {
            console.log(`  ${p}`);
        }

        // TODO: the intermediate, output, build and cache dirs are configureable in the pipeline
        //       reconsider hardcoded ignores. Also why should most of these dirs land in watchPaths?
        this.watcher = chokidar.watch(watchPaths, {
            ignoreInitial: true,
            ignored: [
                '**/node_modules/**',
                '**/.efes-build/**',
                '**/.efes-cache/**',
                '**/2-intermediate/**',
                '**/3-output/**',
            ],
        });

        this.watcher.on('all', (event, filePath) => {
            this.pipeline.emit('watch:change', { event, path: filePath });
            console.log(`  [watch] ${event}: ${path.relative(process.cwd(), filePath)}`);
            this.scheduleRebuild();
        });

        // Keep process alive
        await new Promise<void>(() => {});
    }

    async stop(): Promise<void> {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        if (this.watcher) await this.watcher.close();
        await this.pipeline.shutdown();
    }

    private scheduleRebuild(): void {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(async () => {
            if (this.isRunning) {
                this.pendingRebuild = true;
                return;
            }
            await this.rebuild();
        }, this.debounceMs);
    }

    private async rebuild(): Promise<void> {
        this.isRunning = true;
        const start = performance.now();
        this.pipeline.emit('watch:rebuild:start', {});
        console.log('\n--- Rebuild triggered ---\n');

        try {
            await this.pipeline.run();
            const durationMs = performance.now() - start;
            this.pipeline.emit('watch:rebuild:done', { durationMs });
            console.log(`\n--- Rebuild complete (${(durationMs / 1000).toFixed(2)}s) ---\n`);
        } catch (err) {
            this.pipeline.emit('watch:rebuild:error', { error: err });
            console.error('\n--- Rebuild failed ---\n', err);
        } finally {
            this.isRunning = false;
            if (this.pendingRebuild) {
                this.pendingRebuild = false;
                await this.rebuild();
            }
        }
    }

    /**
     * Extract filesystem paths to watch from all node configs.
     * Scans for string inputs (glob patterns) and FileRef objects.
     * Skips from() references (inter-node dependencies).
     */
    private collectWatchPaths(): string[] {
        const paths = new Set<string>();

        for (const nodeName of this.pipeline.getNodeNames()) {
            const node = this.pipeline.getNodeData(nodeName);
            this.extractPaths(node.config?.config, paths);
        }

        return [...paths].sort();
    }

    private extractPaths(obj: any, paths: Set<string>): void {
        if (obj == null) return;

        // from() reference — skip (inter-node dependency)
        if (inputIsNodeOutputReference(obj)) return;

        // FileRef — watch the file's parent directory
        if (obj?.type === 'file' && typeof obj.path === 'string') {
            paths.add(path.dirname(obj.path));
            return;
        }

        // String — could be a glob pattern or a file path
        if (typeof obj === 'string') {
            // Skip URIs (e.g. file://, http://) — these are XSLT params, not filesystem inputs
            // TODO: we should probably mark path intputs as such / refactor nodes to use fileRef() or
            //       similar instead of string inputs.
            if (/^[a-z]+:\/\//i.test(obj)) return;

            // Extract base directory before any glob wildcard
            const firstWild = obj.search(/[*?{]/);
            if (firstWild >= 0) {
                const baseDir = obj.substring(0, firstWild).replace(/\/[^/]*$/, '') || '.';
                paths.add(baseDir);
            } else if (obj.includes('/')) {
                // Literal path — watch its directory
                paths.add(path.dirname(obj));
            }
            return;
        }

        // Arrays
        if (Array.isArray(obj)) {
            for (const item of obj) {
                this.extractPaths(item, paths);
            }
            return;
        }

        // Objects — recurse into values
        if (typeof obj === 'object') {
            for (const value of Object.values(obj)) {
                this.extractPaths(value, paths);
            }
        }
    }
}
