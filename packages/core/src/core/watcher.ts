import chokidar from 'chokidar';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { Pipeline } from './pipeline';
import { discoverPipeline } from './discoverPipelineFile';

/**
 * Watches a pipeline's input files and triggers rebuilds on changes.
 * Uses chokidar for efficient native filesystem event monitoring.
 * If the pipeline config file itself changes, the pipeline is destroyed
 * and recreated from the updated config before rebuilding.
 *
 * Events:
 *   'reload' (pipeline: Pipeline) — emitted after config change triggers pipeline recreation
 */
export class PipelineWatcher extends EventEmitter {
    private watcher: chokidar.FSWatcher | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private isRunning = false;
    private pendingRebuild = false;
    private buildCancelled = false;
    private lastMtimes = new Map<string, number>();
    private changedFiles = new Set<string>();
    private pipeline: Pipeline;
    private configPath: string;
    private configRelPath: string;
    private projectDir: string;
    private verbose: boolean;

    constructor(
        pipeline: Pipeline,
        configPath: string,
        private debounceMs: number = 300
    ) {
        super();
        this.pipeline = pipeline;
        this.configPath = configPath;
        this.configRelPath = path.relative(pipeline.projectDir, configPath);
        this.projectDir = pipeline.projectDir;
        this.verbose = pipeline.verbose;
    }

    async start(): Promise<void> {
        // Initial full build
        await this.pipeline.run();

        // Collect paths to watch from node configs + discovered dependencies
        const watchPaths = [...this.collectWatchPaths(), this.configPath];

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
            cwd: this.projectDir,
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
                        const absPath = path.resolve(this.projectDir, relPath);
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

        // Add discovered dependencies from the initial build to chokidar
        this.updateWatchPaths();

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
        const absPath = path.resolve(this.projectDir, filePath);

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

        const relPath = path.relative(this.projectDir, absPath);
        this.pipeline.emit('watch:change', { event, path: absPath });
        console.log(`  [watch] ${event}: ${relPath}`);
        this.changedFiles.add(relPath);
        this.scheduleRebuild();
    }

    private scheduleRebuild(): void {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(async () => {
            if (this.isRunning) {
                // Cancel the current (now stale) build — it will restart
                // from the finally block with the latest file changes.
                this.pendingRebuild = true;
                this.buildCancelled = true;
                this.pipeline.cancel();
                return;
            }
            const reload = this.changedFiles.has(this.configRelPath);
            await this.rebuild(reload);
        }, this.debounceMs);
    }

    private async rebuild(reloadPipeline = false): Promise<void> {
        this.isRunning = true;
        this.buildCancelled = false;
        const files = [...this.changedFiles];
        this.changedFiles.clear();
        const start = performance.now();
        this.pipeline.emit('watch:rebuild:start', { files });

        if (reloadPipeline) {
            console.log(`\n--- Pipeline config changed, reloading ---\n`);
        } else {
            console.log(`\n--- Rebuild triggered by ${files.length} file(s): ${files.join(', ')} ---\n`);
        }

        try {
            if (reloadPipeline) {
                await this.pipeline.shutdown();
                this.pipeline = await discoverPipeline(this.projectDir);
                this.pipeline.verbose = this.verbose;
                this.emit('reload', this.pipeline);
            }
            await this.pipeline.run();
            if (this.buildCancelled) {
                console.log(`\n--- Rebuild cancelled, restarting ---\n`);
            } else {
                this.updateWatchPaths();
                const durationMs = performance.now() - start;
                this.pipeline.emit('watch:rebuild:done', { durationMs });
                console.log(`\n--- ${reloadPipeline ? 'Reload' : 'Rebuild'} complete (${(durationMs / 1000).toFixed(2)}s) ---\n`);
            }
        } catch (err) {
            this.pipeline.emit('watch:rebuild:error', { error: err });
            console.error(`\n--- ${reloadPipeline ? 'Reload' : 'Rebuild'} failed ---\n`, err);
        } finally {
            this.isRunning = false;
            if (this.pendingRebuild) {
                this.pendingRebuild = false;
                await this.rebuild();
            }
        }
    }

    /**
     * Collect all root filesystem dependencies from nodes after a pipeline run.
     * Includes glob patterns (from files() config) and absolute paths (discovered at runtime).
     */
    private collectWatchPaths(): string[] {
        const paths = new Set<string>();
        for (const nodeName of this.pipeline.getNodeNames()) {
            const node = this.pipeline.getNodeInstance(nodeName);
            for (const dep of node.rootDependencies) {
                paths.add(dep);
            }
        }
        return [...paths].sort();
    }

    /** After a rebuild, add any newly discovered dependencies to chokidar. */
    private updateWatchPaths(): void {
        if (!this.watcher) return;
        const paths = this.collectWatchPaths();
        if (paths.length > 0) {
            this.watcher.add(paths);
        }
    }
}
