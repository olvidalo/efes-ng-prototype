import { DepGraph } from "dependency-graph";
import { closestMatch } from "leven";
import { CacheManager } from "./cache";
import { glob } from "glob";
import path from "node:path";
import fs from "node:fs/promises";
import { resolveWorkloadPath } from "./runtimeHelpers";
import { EventEmitter } from "node:events";
import { availableParallelism } from "node:os";
import { WorkerPool } from "../xml/workerPool";
import { PipelineNode, isInput, type Input, type CollectRef, type NodeOutput } from "./pipelineNode";

export interface PipelineContext {
    resolveInput(input: Input): Promise<string[]>;

    log(message: string): void;
    debug(message: string): void;

    /** Report item-level progress within a node (e.g. 3 of 50 files processed) */
    progress(nodeName: string, completed: number, total: number): void;

    /** Emit a user-facing message from a node (e.g. xsl:message output) */
    message(nodeName: string, text: string, sourceFile?: string): void;

    /** Retrieve collected messages for a specific node + source file (used by withCache for persistence) */
    getItemMessages(nodeName: string, sourceFile: string): string[];

    signal: AbortSignal;
    cache: CacheManager;
    buildDir: string;
    projectDir: string;
    workerPool: WorkerPool;

    getNodeOutputDir(nodeName: string): string;
    stripBuildPrefix(inputPath: string): string;
    getNodeOutputs(nodeName: string): NodeOutput<any>[] | undefined;
    getNodeInstance(nodeName: string): PipelineNode;

    /** Read the output manifest from the previous successful run of a node. */
    readNodeManifest(nodeName: string): Promise<string[]>;
}

export class Pipeline extends EventEmitter implements PipelineContext {
    private graph = new DepGraph<PipelineNode>();
    private nodeOutputs = new Map<string, NodeOutput<any>[]>;
    private nodeTimings = new Map<string, number>();
    private _cache: CacheManager | null = null;
    private _workerPool: WorkerPool | null = null;
    private needsWiring = false;
    private abortController: AbortController | null = null;
    private resolveInputCache = new Map<string, Promise<string[]>>();
    private _messagesByItem = new Map<string, string[]>();

    /** Project-level metadata. Not used by the pipeline itself — consumed by CLI, GUI, etc. */
    public meta: Record<string, string> = {};

    constructor(
        public readonly name: string,
        public readonly buildDir: string = '.efes-build',
        public readonly cacheDir: string = '.efes-cache',
        public readonly executionMode: 'sequential' | 'parallel' = 'sequential',
        public projectDir: string = process.cwd(),
        public workerThreads: number = availableParallelism(),
        public verbose: boolean = false
    ) {
        super();
        this.installDefaultListeners();
    }

    get cache(): CacheManager {
        if (!this._cache) {
            this._cache = new CacheManager(path.resolve(this.projectDir, this.cacheDir));
        }
        return this._cache;
    }

    get workerPool(): WorkerPool {
        return this.getOrCreateWorkerPool();
    }

    get signal(): AbortSignal {
        return this.abortController!.signal;
    }

    async resolveInput(input: Input): Promise<string[]> {
        const cacheKey = JSON.stringify(input, (_key, value) => {
            if (value && typeof value === 'object' && 'node' in value && 'output' in value) {
                const nodeName = typeof value.node === 'string' ? value.node : value.node.name;
                return `NodeRef:${nodeName}:${value.output}:${value.glob || ''}`;
            }
            return value;
        });

        const cached = this.resolveInputCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const resultPromise = this.resolveInputUncached(input);
        this.resolveInputCache.set(cacheKey, resultPromise);
        return resultPromise;
    }

    log(message: string): void {
        console.log(`  [${this.name}] ${message}`);
    }

    debug(message: string): void {
        if (this.verbose) {
            console.log(`  [${this.name}] [DEBUG] ${message}`);
        }
    }

    progress(nodeName: string, completed: number, total: number): void {
        this.emit('node:progress', { name: nodeName, completed, total });
    }

    /** Emit a user-facing message from a node (e.g. xsl:message output) */
    message(nodeName: string, text: string, sourceFile?: string): void {
        this.emit('node:message', { name: nodeName, text, sourceFile: sourceFile ?? null });
        // Collect for cache storage
        const key = `${nodeName}\0${sourceFile ?? ''}`;
        const msgs = this._messagesByItem.get(key);
        if (msgs) msgs.push(text);
        else this._messagesByItem.set(key, [text]);
    }

    /** Retrieve collected messages for a specific node + source file (used by withCache for persistence) */
    getItemMessages(nodeName: string, sourceFile: string): string[] {
        return this._messagesByItem.get(`${nodeName}\0${sourceFile}`) ?? [];
    }

    getNodeInstance(nodeName: string): PipelineNode {
        return this.graph.getNodeData(nodeName);
    }

    private installDefaultListeners(): void {
        this.on('pipeline:start', ({ name, nodeCount }) =>
            console.log(`Running pipeline ${name}\nNumber of nodes: ${nodeCount}`));
        this.on('pipeline:done', ({ name, durationMs, timings }) => {
            console.log(`  [${name}] Pipeline completed in ${(durationMs / 1000).toFixed(2)}s`);
            console.log(`  [${name}] \nNode timing summary:`);
            for (const [nodeName, time] of timings) {
                const outputDir = this.getNodeOutputDir(nodeName);
                const relDir = path.relative(this.projectDir, outputDir);
                console.log(`  [${name}]   ${nodeName.padEnd(40)} ${(time / 1000).toFixed(2)}s  → ${relDir}`);
            }
        });
        this.on('node:start', ({ name }) =>
            console.log(`  [${this.name}]   ▶ Running: ${name}`));
        this.on('node:done', ({ name, durationMs, cacheStats }) => {
            const cache = cacheStats?.total > 0 && cacheStats.hits === cacheStats.total ? ' (cached)' : '';
            console.log(`  [${this.name}]     ✓ Completed: ${name} (${(durationMs / 1000).toFixed(2)}s)${cache}`);
        });
        this.on('node:error', ({ name, error }) => {
            console.log(`  [${this.name}]     ✗ Failed: ${name}`);
            console.log(`  [${this.name}]       ${error.message}`);
        });
        this.on('node:message', ({ name, text, sourceFile }) => {
            const source = sourceFile ? path.basename(sourceFile) + ': ' : '';
            console.log(`  [${this.name}]   [${name}] 💬 ${source}${text}`);
        });
    }

    private getOrCreateWorkerPool(): WorkerPool {
        if (!this._workerPool) {
            const workerPath = resolveWorkloadPath(import.meta.url, '../xml/genericWorker.mts', 'genericWorker.mjs');
            this._workerPool = new WorkerPool(
                this.workerThreads,
                workerPath,
                (nodeName, message) => {
                    console.log(`  [${this.name}]   [${nodeName}] ${message}`);
                },
                (nodeName, text, sourceFile) => {
                    this.message(nodeName, text, sourceFile ?? undefined);
                },
            );
        }
        return this._workerPool;
    }

    /**
     * Wire dependency edges in the graph. Called lazily on first access.
     * Idempotent — addDependency() silently ignores duplicate edges.
     */
    private ensureReady(): void {
        if (!this.needsWiring) return;
        this.setupCollectDependencies();
        this.setupAutomaticDependencies();
        this.needsWiring = false;
    }

    // --- Public accessors ---

    /** Node names in topological (execution) order. */
    getNodeNames(): string[] {
        this.ensureReady();
        return this.graph.overallOrder();
    }

    /** Direct dependencies of a node. */
    getDependenciesOf(name: string): string[] {
        this.ensureReady();
        return this.graph.dependenciesOf(name);
    }

    /** Get the node instance by name. */
    getNodeData(name: string): PipelineNode {
        return this.graph.getNodeData(name);
    }

    /** Get the resolved output directory for a node. */
    getNodeOutputDir(name: string): string {
        const node = this.graph.getNodeData(name);
        const to = (node.config.outputConfig as any)?.to;
        // Replace ':' with '__' for Windows filesystem compatibility
        // (node names like 'transform:compile' contain ':' which is invalid in Windows paths)
        const safeName = name.replaceAll(':', '__');
        return path.resolve(this.projectDir, to ?? path.join(this.buildDir, safeName));
    }

    /**
     * Strip the build directory prefix (and node-name segment) from a path.
     * E.g. `.efes-build/node-name/some/path/file.html` → `some/path/file.html`
     * Non-build paths are returned relative to projectDir.
     */
    stripBuildPrefix(inputPath: string): string {
        const resolvedBuildDir = path.resolve(this.projectDir, this.buildDir);
        const resolvedInputPath = path.resolve(this.projectDir, inputPath);

        if (resolvedInputPath.startsWith(resolvedBuildDir)) {
            const afterBuildDir = path.relative(resolvedBuildDir, resolvedInputPath);
            const pathParts = afterBuildDir.split(path.sep);
            if (pathParts.length > 1) {
                return path.join(...pathParts.slice(1));
            }
            return afterBuildDir;
        }

        return path.relative(this.projectDir, resolvedInputPath);
    }

    /** Remove all build artifacts: buildDir, cacheDir, and all node output directories. */
    async clean(): Promise<void> {
        this.ensureReady();
        // Shutdown worker pool first — workers may have cwd set to a directory
        // we're about to delete, causing an infinite crash/respawn loop.
        await this.shutdown();
        const dirs = new Set<string>();
        dirs.add(path.resolve(this.projectDir, this.buildDir));
        dirs.add(path.resolve(this.projectDir, this.cacheDir));
        for (const name of this.getNodeNames()) {
            try { dirs.add(this.getNodeOutputDir(name)); } catch { /* node may not have output dir */ }
        }
        await Promise.all([...dirs].map(dir =>
            fs.rm(dir, { recursive: true, force: true }).catch(() => {})
        ));
    }

    /** Total number of nodes (including expanded composite internals). */
    getNodeCount(): number {
        return this.graph.size();
    }

    /** Add a raw dependency edge to the graph (used by CompositeNode). */
    addGraphDependency(fromNode: string, toNode: string): void {
        this.graph.addDependency(fromNode, toNode);
    }

    addNode(...nodes: PipelineNode<any, any>[]): this {
        for (const node of nodes) {
            this.graph.addNode(node.name, node);

            // Call lifecycle hook if it exists
            if (node.onAddedToPipeline) {
                node.onAddedToPipeline(this);
            }
        }

        this.needsWiring = true;
        return this;
    }

    /**
     * Auto-detect dependencies for collect() references by matching against
     * other nodes' outputConfig.outputDir. A node with collect("X") depends on
     * every node whose outputDir is equal to or under "X".
     */
    private setupCollectDependencies() {
        // Build map: normalized outputDir → node names (multiple nodes can share a dir)
        const outputDirToNodes = new Map<string, string[]>();
        for (const nodeName of this.graph.overallOrder()) {
            const outputDir = path.relative(this.projectDir, this.getNodeOutputDir(nodeName));
            const key = path.normalize(outputDir);
            const existing = outputDirToNodes.get(key);
            if (existing) {
                existing.push(nodeName);
            } else {
                outputDirToNodes.set(key, [nodeName]);
            }
        }

        // For each node, scan config for CollectRef and match against outputDirs
        for (const nodeName of this.graph.overallOrder()) {
            const node = this.graph.getNodeData(nodeName);
            this.findCollectRefs(node.config.config, (collectRef) => {
                const collectDir = path.normalize(collectRef.dir);
                for (const [outputDir, writerNames] of outputDirToNodes) {
                    if (outputDir.startsWith(collectDir)) {
                        for (const writerName of writerNames) {
                            if (writerName !== nodeName) {
                                this.graph.addDependency(nodeName, writerName);
                            }
                        }
                    }
                }
            });
        }
    }

    private findCollectRefs(obj: any, callback: (ref: CollectRef) => void): void {
        if (obj == null) return;
        if (isInput(obj)) {
            if (obj.type === 'collect') callback(obj);
            return; // files/from are leaf nodes — don't recurse
        }
        if (typeof obj === 'object') {
            for (const value of Object.values(obj)) {
                this.findCollectRefs(value, callback);
            }
        }
    }

    private setupAutomaticDependencies() {
        // Setup automatic dependencies from NodeOutputReferences in items and config
        for (const nodeName of this.graph.overallOrder()) {
            const node = this.graph.getNodeData(nodeName);

            // Recursively check config for NodeOutputReferences
            if (node.config) {
                const findNodeReferences = (obj: any, path: string = 'config') => {
                    if (isInput(obj)) {
                        if (obj.type === 'from') {
                            const depName = typeof obj.node === 'string' ? obj.node : obj.node.name;
                            try {
                                this.graph.addDependency(node.name, depName);
                            } catch (err) {
                                const allNodes = this.graph.overallOrder();
                                const suggestion = closestMatch(depName, allNodes, { maxDistance: 3 });
                                throw new Error(
                                    `Node "${node.name}": from("${depName}", "${obj.output}") references unknown node "${depName}".` +
                                    `${suggestion ? ` Did you mean "${suggestion}"?` : ''}\n` +
                                    `Available nodes: ${allNodes.join(', ')}`,
                                    { cause: err }
                                );
                            }

                            // Validate output key exists on target node
                            const depNode = this.graph.getNodeData(depName);
                            const validOutputKeys: readonly string[] | undefined = (depNode.constructor as any).outputKeys;
                            if (validOutputKeys && !validOutputKeys.includes(obj.output)) {
                                const keySuggestion = closestMatch(obj.output, [...validOutputKeys], { maxDistance: 3 });
                                throw new Error(
                                    `Node "${node.name}": from("${depName}", "${obj.output}") references unknown output key.` +
                                    `${keySuggestion ? ` Did you mean "${keySuggestion}"?` : ''} ` +
                                    `Available on "${depName}": ${validOutputKeys.join(', ')}`
                                );
                            }
                        }
                        return; // files/collect are leaf nodes — don't recurse
                    }
                    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                        for (const [key, value] of Object.entries(obj)) {
                            findNodeReferences(value, `${path}.${key}`);
                        }
                    }
                };

                findNodeReferences(node.config);
            }
        }
    }

    async run() {
        this.ensureReady();

        // Clear state from previous runs (for re-entrant watch mode)
        this.nodeOutputs.clear();
        this.nodeTimings.clear();
        this.resolveInputCache.clear();
        this._messagesByItem.clear();
        this.abortController = new AbortController();

        const pipelineStart = performance.now();

        this.emit('pipeline:start', { name: this.name, nodeCount: this.graph.size() });

        // Track currently running nodes for supervisor
        const runningNodes = new Set<string>();

        const executionOrder = this.graph.overallOrder();

        // Start supervisor that logs running nodes every 5 seconds
        const supervisorInterval = setInterval(() => {
            if (runningNodes.size > 0) {
                const activeWorkers = this.workerPool.getActiveWorkers();
                console.log(`\n[Supervisor] Currently running ${runningNodes.size} node(s), ${activeWorkers.size} worker(s) busy:`);
                for (const nodeName of runningNodes) {
                    console.log(`  ⏳ ${nodeName}`);
                }
                if (activeWorkers.size > 0) {
                    console.log(`  Workers:`);
                    for (const [workerId, job] of activeWorkers.entries()) {
                        const nodeName = job.nodeName || 'unknown';
                        const fileName = job.xsltPath ? path.basename(job.xsltPath) :
                                        job.sourcePath ? path.basename(job.sourcePath) :
                                        'unknown';
                        console.log(`    Worker ${workerId}: [${nodeName}] ${fileName}`);
                    }
                }
            }
        }, 5000);

        try {
            // Execute nodes based on chosen execution mode
            if (this.executionMode === 'sequential') {
                await this.executeSequential(executionOrder, runningNodes);
            } else {
                await this.executeParallel(executionOrder, runningNodes);
            }

            const durationMs = performance.now() - pipelineStart;
            const timings = Array.from(this.nodeTimings.entries())
                .sort((a, b) => b[1] - a[1]);

            this.emit('pipeline:done', { name: this.name, durationMs, timings });
        } catch (err: any) {
            if (err.name === 'AbortError') {
                this.emit('pipeline:cancelled', { name: this.name });
                return;
            }
            this.emit('pipeline:error', { name: this.name, error: err });
            throw err;
        } finally {
            this.abortController = null;
            clearInterval(supervisorInterval);
        }
    }

    /**
     * Cancel a running pipeline. Stops new nodes/items from starting,
     * terminates in-flight workers, and makes run() return with a
     * 'pipeline:cancelled' event instead of 'pipeline:done'.
     */
    async cancel(): Promise<void> {
        if (!this.abortController) return;
        this.abortController.abort();
        // Clear reference immediately so the next run() creates a fresh pool,
        // even if terminate() is still cleaning up in the background.
        const pool = this._workerPool;
        this._workerPool = null;
        if (pool) {
            await pool.terminate();
        }
    }

    /**
     * Terminate the worker pool. Call this when done with the pipeline
     * (after all run() calls, e.g. when exiting watch mode).
     */
    async shutdown(): Promise<void> {
        if (this._workerPool) {
            await this._workerPool.terminate();
            this._workerPool = null;
        }
    }

    /**
     * Run a single node: emit lifecycle events, execute, store outputs and timing.
     */
    private async executeNode(nodeName: string, runningNodes: Set<string>): Promise<void> {
        const node = this.graph.getNodeData(nodeName);
        node.clearResolvedConfig();
        const nodeStart = performance.now();
        this.emit('node:start', { name: node.name });
        runningNodes.add(node.name);
        try {
            const output = await node.run(this);
            this.nodeOutputs.set(node.name, output);
            // Persist output manifest for stale file detection across runs
            const allOutputPaths = output.flatMap(o => Object.values(o).flat());
            await this.writeNodeManifest(node.name, allOutputPaths);
            const durationMs = performance.now() - nodeStart;
            this.nodeTimings.set(node.name, durationMs);
            this.emit('node:done', { name: node.name, durationMs, cacheStats: node.cacheStats });
        } catch (err: any) {
            this.emit('node:error', { name: node.name, error: err });
            throw err;
        } finally {
            runningNodes.delete(node.name);
        }
    }

    /**
     * Execute nodes sequentially in topological order.
     */
    private async executeSequential(
        executionOrder: string[],
        runningNodes: Set<string>
    ): Promise<void> {
        for (const nodeName of executionOrder) {
            this.signal.throwIfAborted();
            await this.executeNode(nodeName, runningNodes);
        }
    }

    /**
     * Execute nodes in parallel based on dependency readiness.
     * Nodes start as soon as all their dependencies complete, maximizing parallelism.
     */
    private async executeParallel(
        executionOrder: string[],
        runningNodes: Set<string>
    ): Promise<void> {
        const completed = new Set<string>();
        const inProgress = new Set<string>();
        const pending = new Set(executionOrder);
        const errors: Error[] = [];

        const isReady = (nodeName: string): boolean => {
            const deps = this.graph.dependenciesOf(nodeName);
            return deps.every(dep => completed.has(dep));
        };

        const runNode = async (nodeName: string): Promise<void> => {
            try {
                await this.executeNode(nodeName, runningNodes);
            } catch (err: any) {
                errors.push(err);
                throw err;
            } finally {
                inProgress.delete(nodeName);
                completed.add(nodeName);
            }
        };

        const startReadyNodes = (): void => {
            if (this.signal.aborted) return;
            for (const nodeName of pending) {
                if (!inProgress.has(nodeName) && isReady(nodeName)) {
                    pending.delete(nodeName);
                    inProgress.add(nodeName);

                    runNode(nodeName)
                        .then(() => {
                            if (errors.length === 0) {
                                startReadyNodes();
                            }
                        })
                        .catch(() => {
                            // Error already handled in runNode
                        });
                }
            }
        };

        startReadyNodes();

        // Wait for all nodes to complete, error, or cancel
        while (inProgress.size > 0 || (pending.size > 0 && errors.length === 0 && !this.signal.aborted)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.signal.aborted) {
            this.signal.throwIfAborted();
        }

        if (errors.length > 0) {
            throw errors[0];
        }
    }

    /**
     * Implementation of resolveInput without caching (used internally by cached version)
     */
    private async resolveInputUncached(input: Input): Promise<string[]> {
        switch (input.type) {
            case 'from': {
                const nodeName = typeof input.node === 'string' ? input.node : input.node.name;
                let outputs = this.nodeOutputs.get(nodeName)?.flatMap(output => output[input.output]).filter(x => x !== undefined);
                if (!outputs || outputs.length === 0) {
                    throw new Error(`Node "${nodeName}" hasn't run yet or has not produced any outputs.`);
                }

                // Apply glob filtering if specified
                if (input.glob) {
                    let globPattern: string;
                    if (outputs[0]?.startsWith(this.buildDir)) {
                        globPattern = `${this.buildDir}/*/${input.glob}`
                    } else {
                        globPattern = input.glob;
                    }

                    const matches = await glob(globPattern, { cwd: this.projectDir });
                    const matchSet = new Set(matches.map(m => path.resolve(this.projectDir, m)));

                    const filteredOutputs = outputs.filter(outputPath =>
                        matchSet.has(path.resolve(this.projectDir, outputPath))
                    );

                    if (filteredOutputs.length === 0) {
                        throw new Error(`No files from node "${nodeName}" output "${input.output}" match pattern: ${input.glob}.\nOutputs: ${JSON.stringify(outputs, null, 2)}`);
                    }
                    outputs = filteredOutputs;
                }

                return outputs;
            }

            case 'files': {
                const results: string[] = [];
                for (const pattern of input.patterns) {
                    const matches = await glob(pattern, { cwd: this.projectDir, nodir: true });
                    if (matches.length === 0) {
                        const resolved = path.resolve(this.projectDir, pattern);
                        const isDir = await fs.stat(resolved).then(s => s.isDirectory(), () => false);
                        if (isDir) {
                            throw new Error(`files() resolved to a directory: ${pattern}. Use dir() for directory paths or add a glob pattern (e.g., "${pattern}/**/*").`);
                        }
                        throw new Error(`No files found for pattern: ${pattern}`);
                    }
                    results.push(...matches.map(m => path.resolve(this.projectDir, m)));
                }
                return results;
            }

            case 'collect': {
                const matches = await glob(path.join(input.dir, '**/*'), { nodir: true, cwd: this.projectDir });
                return matches.map(m => path.resolve(this.projectDir, m));
            }

            case 'dir': {
                const resolved = path.resolve(this.projectDir, input.path);
                const isDir = await fs.stat(resolved).then(s => s.isDirectory(), () => false);
                if (!isDir) {
                    throw new Error(`dir() path is not a directory: ${input.path}`);
                }
                return [resolved.endsWith('/') ? resolved : resolved + '/'];
            }

            default:
                input satisfies never;
                throw new Error(`Unknown input type: ${JSON.stringify(input)}`);
        }
    }

    /**
     * Get the outputs of a specific node after pipeline execution.
     * Returns undefined if the node hasn't run yet or doesn't exist.
     */
    getNodeOutputs(nodeName: string): NodeOutput<any>[] | undefined {
        return this.nodeOutputs.get(nodeName);
    }

    /** Read the output manifest from the previous successful run of a node. */
    async readNodeManifest(nodeName: string): Promise<string[]> {
        const manifestPath = path.join(this.cacheDir, `${nodeName}.manifest.json`);
        try {
            return JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
        } catch {
            return [];
        }
    }

    /** Write the output manifest after a successful node run. */
    private async writeNodeManifest(nodeName: string, outputs: string[]): Promise<void> {
        await fs.mkdir(this.cacheDir, { recursive: true });
        const manifestPath = path.join(this.cacheDir, `${nodeName}.manifest.json`);
        await fs.writeFile(manifestPath, JSON.stringify(outputs));
    }
}
