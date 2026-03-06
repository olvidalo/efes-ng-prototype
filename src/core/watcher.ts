import chokidar from 'chokidar';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { Pipeline, inputIsNodeOutputReference, inputIsFilesRef, inputIsCollectRef } from './pipeline';

/**
 * Watches a pipeline's input files and triggers rebuilds on changes.
 * Uses chokidar for efficient native filesystem event monitoring.
 */
export class PipelineWatcher {
    private watcher: chokidar.FSWatcher | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private isRunning = false;
    private pendingRebuild = false;
    private lastMtimes = new Map<string, number>();

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

        // NOTE: If a pipeline uses broad globs (e.g. files("**/*.xml")), node output dirs
        // could fall inside watched trees, causing feedback loops. Possible fix: scan
        // node outputConfigs to build an ignore list dynamically.
        this.watcher = chokidar.watch(watchPaths, {
            cwd: this.pipeline.projectDir,
            ignoreInitial: true,
            ignored: [
                '**/node_modules/**',
                '**/.DS_Store',
                `**/${this.pipeline.buildDir}/**`,
                `**/${this.pipeline.cacheDir}/**`,
            ],
        });

        // Seed mtime map from chokidar's initial scan so that metadata-only
        // changes (xattr updates on file open etc.) don't trigger a spurious rebuild
        await new Promise<void>(resolve => {
            this.watcher!.on('ready', async () => {
                const watched = this.watcher!.getWatched();
                const statPromises: Promise<void>[] = [];
                for (const [dir, names] of Object.entries(watched)) {
                    for (const name of names) {
                        const relPath = path.join(dir, name);
                        const absPath = path.resolve(this.pipeline.projectDir, relPath);
                        statPromises.push(
                            stat(absPath).then(s => {
                                if (s.isFile()) this.lastMtimes.set(absPath, s.mtimeMs);
                            }).catch(() => {})
                        );
                    }
                }
                await Promise.all(statPromises);
                resolve();
            });
        });

        this.watcher.on('change', (filePath) => this.onFileEvent('change', filePath));
        this.watcher.on('add', (filePath) => this.onFileEvent('add', filePath));
        this.watcher.on('unlink', (filePath) => this.onFileEvent('unlink', filePath));

        // Keep process alive
        await new Promise<void>(() => {});
    }

    async stop(): Promise<void> {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        if (this.watcher) await this.watcher.close();
        await this.pipeline.shutdown();
    }

    private async onFileEvent(event: string, filePath: string): Promise<void> {
        const absPath = path.resolve(this.pipeline.projectDir, filePath);

        // For change events, skip if mtime hasn't actually changed
        // (OS and editors can trigger ctime-only changes via xattrs, locks, etc.)
        if (event === 'change') {
            try {
                const { mtimeMs } = await stat(absPath);
                const lastMtime = this.lastMtimes.get(absPath);
                this.lastMtimes.set(absPath, mtimeMs);
                if (lastMtime !== undefined && mtimeMs === lastMtime) return;
            } catch {
                // File may have been deleted between event and stat — let it through
            }
        }

        this.pipeline.emit('watch:change', { event, path: absPath });
        console.log(`  [watch] ${event}: ${path.relative(this.pipeline.projectDir, absPath)}`);
        this.scheduleRebuild();
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
     * Scans for files() and from() references in node configs.
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

        // from() reference — skip (inter-node dependency, outputs are pipeline-internal)
        if (inputIsNodeOutputReference(obj)) return;

        // collect() reference — skip (intermediate directory, not a source input)
        if (inputIsCollectRef(obj)) return;

        // files() reference — pass glob patterns directly to chokidar
        if (inputIsFilesRef(obj)) {
            for (const pattern of obj.patterns) {
                paths.add(pattern);
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

        // Objects — recurse into values (plain config objects)
        if (typeof obj === 'object') {
            for (const value of Object.values(obj)) {
                this.extractPaths(value, paths);
            }
        }
    }
}
