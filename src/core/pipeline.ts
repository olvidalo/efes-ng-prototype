import {DepGraph} from "dependency-graph";
import {CacheManager} from "./cache";
import {glob} from "glob";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import {resolveWorkloadPath} from "./resolveWorkloadPath";
import {EventEmitter} from "node:events";
import {WorkerPool} from "../xml/workerPool";

interface NodeOutputReference {
    node: PipelineNode<any, any> | string;
    output: string;
    glob?: string;  // Optional glob pattern to filter output files
}

export function inputIsNodeOutputReference(value: any): value is NodeOutputReference {
    return typeof value === 'object' && value !== null && 'node' in value && 'output' in value;
}

// FilesRef: tagged filesystem reference (glob patterns or literal paths)
export type FilesRef = { type: 'files', patterns: string[] };

export function files(...patterns: string[]): FilesRef {
    return { type: 'files', patterns };
}

export function inputIsFilesRef(value: any): value is FilesRef {
    return typeof value === 'object' && value !== null && value?.type === 'files';
}

// AbsolutePath: a project-relative path that should be resolved to an absolute path at runtime.
// Unlike files(), this is not a dependency reference — it's just path resolution. No glob, no tracking.
export type AbsolutePath = { type: 'absolute', path: string };

export function absolute(p: string): AbsolutePath {
    return { type: 'absolute', path: p };
}

export function isAbsolutePath(value: any): value is AbsolutePath {
    return typeof value === 'object' && value !== null && value?.type === 'absolute';
}

// CollectRef: reference to an intermediate directory assembled by multiple upstream nodes.
// The pipeline auto-detects which nodes write to this directory and adds dependency edges.
// Unlike files(), collect() paths are NOT watched (they're intermediate, not source).
export type CollectRef = { type: 'collect', dir: string };

export function collect(dir: string): CollectRef {
    return { type: 'collect', dir };
}

export function inputIsCollectRef(value: any): value is CollectRef {
    return typeof value === 'object' && value !== null && value?.type === 'collect';
}

export type Input = FilesRef | NodeOutputReference | CollectRef;
export type NodeOutput<TKey extends string> = Record<TKey, string[]>;

export function from<TNode extends PipelineNode<any, TOutput>, TOutput extends string>(
    node: TNode,
    output: TOutput,
    glob?: string
): NodeOutputReference;
export function from(nodeName: string, output: string, glob?: string): NodeOutputReference;
export function from(nodeOrName: PipelineNode<any, any> | string, output: string, glob?: string): NodeOutputReference {
    return { node: nodeOrName, output, glob };
}

/**
 * Unified output configuration for all node types.
 * Provides smart defaults and escape hatches for common path manipulation patterns.
 */
export interface OutputConfig {
    /** Output directory. Default: buildDir/nodeName */
    to?: string;
    /** Strip this prefix from input paths (e.g., from: "1-input", to: "2-intermediate") */
    from?: string;
    /** Flatten to just filename, ignoring directory structure */
    flat?: boolean;
    /** Override entire output filename (string or function) */
    outputFilename?: string | ((inputPath: string) => string);
    /** Change file extension (e.g., '.html', '.json') */
    extension?: string;
}

export interface PipelineNodeConfig {
    name: string;
    // Processing configuration (may contain Input values via files() or from())
    config: Record<string, any>;
    // Output settings (excluded from content signature)
    outputConfig?: Record<string, any>;
}


/** Config type with all Input fields resolved to string[]. */
type ResolveField<F> = F extends Input ? string[] : F;
type ResolvedConfig<T> = { [K in keyof T]: ResolveField<T[K]> };

export abstract class PipelineNode<TConfig extends PipelineNodeConfig = PipelineNodeConfig, TOutput extends string = string> {
    /** Set by withCache() after each run — null if node doesn't use caching */
    cacheStats: { hits: number; total: number } | null = null;

    /** Lazily resolved config — all Input refs replaced with resolved paths.
     *  Cleared between runs (watch mode). */
    private _resolvedConfig: Record<string, any> | null = null;

    constructor(public readonly config: TConfig) {
    }

    /** Clear resolved config cache (called between runs for watch mode). */
    clearResolvedConfig(): void {
        this._resolvedConfig = null;
    }

    get name() {
        return this.config.name;
    }

    /**
     * Log a message with the node name prepended.
     */
    protected log(context: PipelineContext, message: string): void {
        context.log(`  [${this.name}] ${message}`);
    }

    /**
     * Hash an output file for cache tracking purposes.
     * Override in subclasses to normalize non-deterministic output before hashing
     * (e.g., strip compiler timestamps from generated files).
     *
     * Used by downstream nodes when tracking this node's outputs as dependencies.
     */
    async hashOutputFile(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Lazily resolve all Input references in this node's config.
     * Cached per run — subsequent calls return the same result.
     * Input fields → string[], map fields → deep-resolved, scalars → pass through.
     */
    protected async resolvedConfig(context: PipelineContext): Promise<ResolvedConfig<TConfig['config']>> {
        if (this._resolvedConfig) return this._resolvedConfig as ResolvedConfig<TConfig['config']>;

        const resolved: Record<string, any> = {};
        for (const [key, value] of Object.entries(this.config.config || {})) {
            resolved[key] = await this.resolveConfigValue(context, value);
        }
        this._resolvedConfig = resolved;
        return resolved as ResolvedConfig<TConfig['config']>;
    }

    private async resolveConfigValue(context: PipelineContext, value: any): Promise<any> {
        if (value == null) return value;
        if (inputIsFilesRef(value) || inputIsNodeOutputReference(value) || inputIsCollectRef(value)) {
            return context.resolveInput(value);
        }
        if (isAbsolutePath(value)) {
            return [path.resolve(context.projectDir, value.path)];
        }
        // Plain objects (maps) — resolve nested Input refs, unwrap single-element arrays
        if (typeof value === 'object' && !Array.isArray(value)
            && Object.getPrototypeOf(value) === Object.prototype) {
            const resolved: Record<string, any> = {};
            for (const [k, v] of Object.entries(value)) {
                const r = await this.resolveConfigValue(context, v);
                // Inside maps, unwrap single-element arrays for ergonomic use as params
                resolved[k] = Array.isArray(r) && r.length === 1 ? r[0] : r;
            }
            return resolved;
        }
        return value;
    }

    /**
     * Optional lifecycle hook called when this node is added to a pipeline.
     * Composite nodes can use this to expand their internal nodes.
     */
    onAddedToPipeline?(pipeline: Pipeline): void;

    abstract run(context: PipelineContext): Promise<NodeOutput<TOutput>[]>;

    /**
     * Generate a content signature for this node based on its configuration.
     * Nodes with identical signatures can share cache entries.
     * Uses file paths (stable) instead of content hashes (changing) to prevent cache pollution.
     */
    /**
     * Calculate output path for a given input path using unified config.
     * Handles build prefix stripping, path manipulation, and filename changes.
     *
     * @param inputPath - Input file path
     * @param context - Pipeline context
     * @param outputConfig - Unified output configuration
     * @param defaultExtension - Default extension for this node type (optional)
     * @returns Final output path
     */
    protected calculateOutputPath(
        inputPath: string,
        context: PipelineContext,
        outputConfig: OutputConfig,
        defaultExtension?: string
    ): string {
        // Step 1: Strip build prefix to get clean path
        const cleanPath = context.stripBuildPrefix(inputPath);

        // Step 2: Apply path structure manipulation
        let processedPath: string;

        if (outputConfig.flat) {
            // Just filename, no directory structure
            processedPath = path.basename(cleanPath);
        } else if (outputConfig.from) {
            // Strip input base prefix from path
            const prefix = outputConfig.from;
            const normalizedClean = cleanPath.split(path.sep).join('/');
            const normalizedPrefix = prefix.split(path.sep).join('/');

            if (normalizedClean.startsWith(normalizedPrefix)) {
                const stripped = normalizedClean.substring(normalizedPrefix.length);
                processedPath = stripped.startsWith('/') ? stripped.substring(1) : stripped;
            } else {
                processedPath = cleanPath;
            }
        } else {
            // Default: preserve full path
            processedPath = cleanPath;
        }

        // Step 3: Apply filename changes
        let finalFilename: string;

        if (outputConfig.outputFilename) {
            // Override entire filename
            if (typeof outputConfig.outputFilename === 'function') {
                finalFilename = outputConfig.outputFilename(inputPath);
            } else {
                finalFilename = outputConfig.outputFilename;
            }
        } else {
            // Apply extension and/or suffix changes
            const dir = path.dirname(processedPath);
            const basename = path.basename(processedPath);
            const ext = path.extname(basename);
            const nameWithoutExt = path.basename(basename, ext);

            const newExt = outputConfig.extension ?? defaultExtension ?? ext;
            const newBasename = `${nameWithoutExt}${newExt}`;
            finalFilename = dir === '.' ? newBasename : path.join(dir, newBasename);
        }

        // Step 4: Combine with output directory
        return path.join(context.getNodeOutputDir(this.name), finalFilename);
    }

    /**
     * Serialize a value (without key prefix) for content signature.
     * Recursive helper for serializeForSignature.
     */
    private serializeValue(value: any, path: string): string {
        // Null/undefined
        if (value === null || value === undefined) {
            return 'null';
        }

        // files() reference - use patterns
        if (inputIsFilesRef(value)) {
            return `files(${value.patterns.join(',')})`;
        }

        // from() reference - use logical reference
        if (inputIsNodeOutputReference(value)) {
            const globPart = value.glob ? `:${value.glob}` : '';
            const nodeName = typeof value.node === 'string' ? value.node : value.node.name;
            return `from(${nodeName}:${value.output}${globPart})`;
        }

        // collect() reference - use directory path
        if (inputIsCollectRef(value)) {
            return `collect(${value.dir})`;
        }

        // Functions - use toString()
        if (typeof value === 'function') {
            return value.toString();
        }

        // Plain primitives
        if (typeof value !== 'object') {
            return JSON.stringify(value);
        }

        // Arrays - recursively serialize elements
        if (Array.isArray(value)) {
            const elements = value.map((v, i) => this.serializeValue(v, `${path}[${i}]`));
            return `[${elements.join(',')}]`;
        }

        // Plain objects - recursively serialize properties
        const entries = Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${this.serializeValue(v, `${path}.${k}`)}`);
        return `{${entries.join(',')}}`;
    }

    /**
     * Serialize a config key-value pair for inclusion in content signature.
     * Throws if encountering unknown object types to ensure we handle all cases.
     *
     * TODO: Move config validation logic to a central location, not tied to signature generation.
     * This would allow validating configs at node construction time rather than during execution.
     */
    private serializeForSignature(key: string, value: any): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        const serializedValue = this.serializeValue(value, key);
        return `${key}:${serializedValue}`;
    }

    protected async getContentSignature(): Promise<string> {
        const configParts: string[] = [];

        // Serialize all config values
        for (const [key, value] of Object.entries(this.config.config || {})) {
            const serialized = this.serializeForSignature(key, value);
            if (serialized) {
                configParts.push(serialized);
            }
        }

        // Combine all parts, sort for consistency, and hash
        const combined = configParts.sort().join('|');
        const hash = crypto.createHash('sha256').update(combined).digest('hex');

        return `${this.constructor.name}-${hash.substring(0, 8)}`;
    }

    /**
     * Unified caching for single or multiple items.
     * Phase 1: Sequential cache check for all items.
     * Phase 2: Parallel work dispatch for all cache misses.
     */
    protected async withCache<TOutput extends string>(
        context: PipelineContext,
        items: string[],
        getCacheKey: (item: string) => string,
        getOutputPath: (item: string, outputKey: TOutput, filename?: string) => string | undefined,
        performWork: (item: string) => Promise<{
            outputs: Record<TOutput, string[]>;
            discoveredDependencies?: string[];
        }>
    ): Promise<Array<{ item: string, outputs: NodeOutput<TOutput>, cached: boolean }>> {
        const deps = await this.resolveCacheDeps(context, items);
        const cacheKeys = items.map(getCacheKey);
        const hashFile = this.buildHashFile(deps, context.cache);

        context.log(`Cache lookup - contentSignature: ${deps.contentSignature}`);

        // Phase 1: Sequential cache validation
        const results: Array<{ item: string, outputs: NodeOutput<TOutput>, cached: boolean }> = [];
        const misses: Array<{ index: number, item: string, cacheKey: string }> = [];

        let completed = 0;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const cached = await this.tryFromCache(context, item, cacheKeys[i], deps, getOutputPath, hashFile);
            if (cached) {
                context.log(`  - Skipping: ${item} (cached)`);
                completed++;
                context.progress(this.name, completed, items.length);
                results[i] = { item, outputs: cached as NodeOutput<TOutput>, cached: true };
            } else {
                misses.push({ index: i, item, cacheKey: cacheKeys[i] });
            }
        }

        // Phase 2: Parallel work dispatch for all misses
        if (misses.length > 0) {
            context.log(`Processing ${misses.length} cache misses`);
            await Promise.all(misses.map(async ({ index, item, cacheKey }) => {
                context.signal.throwIfAborted();
                const result = await performWork(item);
                completed++;
                context.progress(this.name, completed, items.length);
                await this.storeCacheEntry(context, cacheKey, item, result, deps);
                results[index] = { item, outputs: result.outputs as NodeOutput<TOutput>, cached: false };
            }));
        }

        this.cacheStats = { hits: results.filter(r => r.cached).length, total: results.length };
        return results;
    }

    /**
     * Build cache dependency metadata from already-resolved config.
     * Walks raw config to categorize inputs by type, using resolved paths
     * from this.resolvedConfig() — no re-resolution.
     */
    private async resolveCacheDeps(context: PipelineContext, items: string[]): Promise<ResolvedDeps> {
        const contentSignature = await this.getContentSignature();
        const outputDir = context.getNodeOutputDir(this.name);

        const resolvedCfg = await this.resolvedConfig(context);

        const configDependencyPaths: string[] = [];
        const upstreamResolved = new Map<string, { ref: NodeOutputReference, paths: string[] }>();
        const pathToProducer = new Map<string, PipelineNode<any, any>>();

        // Walk raw config + resolved config in parallel to categorize inputs
        const categorize = (rawValue: any, resolvedValue: any) => {
            if (inputIsFilesRef(rawValue) || inputIsCollectRef(rawValue)) {
                const paths = Array.isArray(resolvedValue) ? resolvedValue : [resolvedValue];
                configDependencyPaths.push(...paths);
            } else if (inputIsNodeOutputReference(rawValue)) {
                const paths = Array.isArray(resolvedValue) ? resolvedValue : [resolvedValue];
                configDependencyPaths.push(...paths);
                const upstreamName = typeof rawValue.node === 'string' ? rawValue.node : rawValue.node.name;
                upstreamResolved.set(upstreamName, { ref: rawValue, paths });
                const upstreamNode = context.getNodeInstance(upstreamName);
                for (const p of paths) {
                    pathToProducer.set(p, upstreamNode);
                }
            } else if (isAbsolutePath(rawValue)) {
                // Static config path — not a tracked dependency
            } else if (rawValue != null && typeof rawValue === 'object') {
                const resolvedObj = resolvedValue ?? {};
                for (const [k, v] of Object.entries(rawValue)) {
                    categorize(v, resolvedObj[k]);
                }
            }
        };

        for (const [key, rawValue] of Object.entries(this.config.config || {})) {
            categorize(rawValue, resolvedCfg[key]);
        }

        // Compute upstream output signatures from already-resolved paths
        const upstreamOutputSignatures: ResolvedDeps['upstreamOutputSignatures'] = {};
        for (const [nodeName, { ref, paths }] of upstreamResolved.entries()) {
            upstreamOutputSignatures[nodeName] = {
                signature: CacheManager.computeOutputSignature(paths),
                outputKey: ref.output,
                glob: ref.glob
            };
        }

        // Items are tracked per-entry by buildCacheEntry. Tracking them ALSO as shared
        // fileRefs would cause one item's change to invalidate ALL items. Filter them out.
        const itemSet = new Set(items);
        const sharedDependencyPaths = configDependencyPaths.filter(p => !itemSet.has(p));

        // Pre-compute hashes for shared dependencies (e.g. stylesheets) — avoids
        // hashing the same file N times (once per item)
        const sharedFileHashes = new Map<string, { hash: string; timestamp: number }>();
        if (sharedDependencyPaths.length > 0) {
            context.log(`Pre-computing hashes for ${sharedDependencyPaths.length} shared dependencies`);
            await Promise.all(sharedDependencyPaths.map(async (filePath) => {
                try {
                    const producer = pathToProducer.get(filePath);
                    const [hash, stats] = await Promise.all([
                        producer ? producer.hashOutputFile(filePath) : context.cache.computeFileHash(filePath),
                        fs.stat(filePath)
                    ]);
                    sharedFileHashes.set(filePath, { hash, timestamp: stats.mtimeMs });
                } catch {
                    // File doesn't exist, skip
                }
            }));
        }

        return {
            contentSignature, outputDir, pathToProducer,
            upstreamOutputSignatures, sharedDependencyPaths, sharedFileHashes,
        };
    }

    /**
     * Build a memoized hashFile callback that dispatches to upstream node's
     * hashOutputFile() when available (e.g. strips non-deterministic SEF fields).
     */
    private buildHashFile(
        deps: ResolvedDeps,
        cache: CacheManager
    ): (fp: string) => Promise<string> {
        const memo = new Map<string, string>();
        return async (fp: string) => {
            let result = memo.get(fp);
            if (result) return result;
            const producer = deps.pathToProducer.get(fp);
            result = await (producer ? producer.hashOutputFile(fp) : cache.computeFileHash(fp));
            memo.set(fp, result);
            return result;
        };
    }

    /**
     * Check if a single item has a valid cache entry. Returns recalculated outputs
     * on cache hit (copying cross-node files if needed), or null on miss.
     */
    private async tryFromCache<TOutput extends string>(
        context: PipelineContext,
        item: string,
        cacheKey: string,
        deps: ResolvedDeps,
        getOutputPath: (item: string, outputKey: TOutput, filename?: string) => string | undefined,
        hashFile: (fp: string) => Promise<string>,
    ): Promise<Record<TOutput, string[]> | null> {
        const cached = await context.cache.getCache(deps.contentSignature, cacheKey);
        if (!cached) return null;

        // Recalculate expected output paths based on CURRENT config
        const newOutputsByKey: Record<TOutput, string[]> = {} as Record<TOutput, string[]>;

        for (const [outputKey, cachedPaths] of Object.entries(cached.outputsByKey)) {
            const recalculatedPath = getOutputPath(item, outputKey as TOutput);

            if (recalculatedPath !== undefined) {
                // Primary outputs — use current config
                newOutputsByKey[outputKey as TOutput] = [recalculatedPath];
            } else {
                // Secondary outputs — reconstruct from cached directory structure
                const newPaths: string[] = [];
                for (const cachedPath of cachedPaths) {
                    const relativePath = path.relative(cached.outputBaseDir, cachedPath);
                    if (relativePath.startsWith('..')) {
                        throw new Error(`Cached output path escapes base directory: ${cachedPath} (base: ${cached.outputBaseDir})`);
                    }
                    newPaths.push(path.join(deps.outputDir, relativePath));
                }
                newOutputsByKey[outputKey as TOutput] = newPaths;
            }
        }

        // Validate dependencies
        const dependenciesValid = await context.cache.isValid(cached, context.resolveInput.bind(context), hashFile);
        if (!dependenciesValid) return null;

        // Copy files if needed (cross-node cache reuse)
        for (const [outputKey, cachedPaths] of Object.entries(cached.outputsByKey)) {
            const expectedPaths = newOutputsByKey[outputKey as TOutput];
            for (let j = 0; j < cachedPaths.length; j++) {
                if (cachedPaths[j] !== expectedPaths[j]) {
                    await context.cache.copyToExpectedPath(cachedPaths[j], expectedPaths[j]);
                }
            }
        }

        return newOutputsByKey;
    }

    /**
     * Build and persist a cache entry for a completed work item.
     */
    private async storeCacheEntry<TOutput extends string>(
        context: PipelineContext,
        cacheKey: string,
        item: string,
        result: { outputs: Record<TOutput, string[]>; discoveredDependencies?: string[] },
        deps: ResolvedDeps,
    ): Promise<void> {
        const cacheEntry = await context.cache.buildCacheEntry({
            itemPaths: [item],
            outputsByKey: result.outputs,
            outputBaseDir: deps.outputDir,
            itemKey: cacheKey,
            discoveredDependencies: result.discoveredDependencies,
            fileRefPaths: deps.sharedDependencyPaths,
            upstreamOutputSignatures: deps.upstreamOutputSignatures,
            precomputedHashes: deps.sharedFileHashes,
        });
        await context.cache.setCache(deps.contentSignature, cacheKey, cacheEntry);
    }

}

/** Resolved dependency information for cache validation, built once per withCache() call. */
interface ResolvedDeps {
    /** Hash of node class + config — identifies this node's "shape" for cache slot sharing */
    contentSignature: string;
    /** Absolute path to this node's output directory */
    outputDir: string;
    /** Maps file paths to the upstream node that produced them — used to dispatch
     *  custom hash functions (e.g. CompileStylesheetNode strips non-deterministic SEF fields) */
    pathToProducer: Map<string, PipelineNode<any, any>>;
    /** Per-upstream-node signature of their output file set — fast invalidation when
     *  an upstream node's outputs change without checking every file */
    upstreamOutputSignatures: Record<string, { signature: string; outputKey: string; glob?: string }>;
    /** Config dependency paths shared across all items (e.g. stylesheets), excluding
     *  per-item input paths to avoid one item's change invalidating all items */
    sharedDependencyPaths: string[];
    /** Pre-computed hashes + timestamps for shared dependencies — avoids hashing the
     *  same stylesheet N times (once per item) */
    sharedFileHashes: Map<string, { hash: string; timestamp: number }>;
}

export interface PipelineContext {
    resolveInput(input: Input): Promise<string[]>;

    log(message: string): void;

    /** Report item-level progress within a node (e.g. 3 of 50 files processed) */
    progress(nodeName: string, completed: number, total: number): void;

    signal: AbortSignal;
    cache: CacheManager;
    buildDir: string;
    projectDir: string;
    workerPool: WorkerPool;

    getBuildPath(nodeName: string, inputPath: string, newExtension?: string): string;
    getNodeOutputDir(nodeName: string): string;
    stripBuildPrefix(inputPath: string): string;
    getNodeOutputs(nodeName: string): NodeOutput<any>[] | undefined;
    getNodeInstance(nodeName: string): PipelineNode;
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

    constructor(
        public readonly name: string,
        public readonly buildDir: string = '.efes-build',
        public readonly cacheDir: string = '.efes-cache',
        public readonly executionMode: 'sequential' | 'parallel' = 'sequential',
        public projectDir: string = process.cwd(),
        public workerThreads: number = 8
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
        const cacheKey = JSON.stringify(input, (key, value) => {
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

        const resultPromise = this.resolveInputImpl(input);
        this.resolveInputCache.set(cacheKey, resultPromise);
        return resultPromise;
    }

    log(message: string): void {
        console.log(`  [${this.name}] ${message}`);
    }

    progress(nodeName: string, completed: number, total: number): void {
        this.emit('node:progress', { name: nodeName, completed, total });
    }

    getBuildPath(nodeName: string, inputPath: string, newExtension?: string): string {
        let relativePath = inputPath;

        // Check if this is a build artifact path and strip build dir + source node name
        const resolvedBuildDir = path.resolve(this.projectDir, this.buildDir);
        const resolvedInputPath = path.resolve(this.projectDir, inputPath);

        if (resolvedInputPath.startsWith(resolvedBuildDir)) {
            // Strip build dir: .efes-build/upstream:transform/some/path/file.html
            const afterBuildDir = path.relative(resolvedBuildDir, resolvedInputPath);

            // Strip source node name: upstream:transform/some/path/file.html -> some/path/file.html
            const pathParts = afterBuildDir.split(path.sep);
            if (pathParts.length > 1) {
                relativePath = path.join(...pathParts.slice(1));
            }
        } else {
            // For non-build paths, make them relative to projectDir
            relativePath = path.relative(this.projectDir, inputPath);
        }

        // Now build the new path
        const buildPath = path.join(this.buildDir, nodeName, relativePath);
        return newExtension ?
            buildPath.replace(path.extname(buildPath), newExtension) :
            buildPath;
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
                console.log(`  [${name}]   ${nodeName.padEnd(40)} ${(time / 1000).toFixed(2)}s`);
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
    }

    private getOrCreateWorkerPool(): WorkerPool {
        if (!this._workerPool) {
            const workerPath = resolveWorkloadPath(import.meta.url, '../xml/genericWorker.ts', 'genericWorker.js');
            this._workerPool = new WorkerPool(this.workerThreads, workerPath);
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
        return path.resolve(this.projectDir, to ?? path.join(this.buildDir, name));
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
            const node = this.graph.getNodeData(nodeName);
            const outputDir = (node.config.outputConfig as any)?.to;
            if (outputDir) {
                const key = path.normalize(outputDir);
                const existing = outputDirToNodes.get(key);
                if (existing) {
                    existing.push(nodeName);
                } else {
                    outputDirToNodes.set(key, [nodeName]);
                }
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
        if (inputIsCollectRef(obj)) { callback(obj); return; }
        if (inputIsNodeOutputReference(obj) || inputIsFilesRef(obj)) return;
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
                    if (inputIsCollectRef(obj) || inputIsFilesRef(obj)) return;  // handled elsewhere
                    if (inputIsNodeOutputReference(obj)) {
                        const depName = typeof obj.node === 'string' ? obj.node : obj.node.name;
                        try {
                            this.graph.addDependency(node.name, depName);
                        } catch (err: any) {
                            throw new Error(`Failed to add automatic dependency for node ${node.name}: ${err.message}`);
                        }
                    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                        // Recursively search nested objects
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
        if (this._workerPool) {
            await this._workerPool.terminate();
            this._workerPool = null;
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
    private async resolveInputImpl(input: Input): Promise<string[]> {
        // Node references
        if (inputIsNodeOutputReference(input)) {
            const nodeName = typeof input.node === 'string' ? input.node : input.node.name;
            let outputs = this.nodeOutputs.get(nodeName)?.flatMap(output => output[input.output]).filter(x => x !== undefined);
            if (!outputs || outputs.length === 0) {
                throw new Error(`Node "${nodeName}" hasn't run yet or has not produced any outputs.`);
            }

            // Apply glob filtering if specified
            if (input.glob) {
                // Determine glob pattern based on first output location
                // (all outputs from a node are in the same location)
                let globPattern: string;
                if (outputs[0]?.startsWith(this.buildDir)) {
                    // Output is in default build directory - use full path for globbing
                    globPattern = `${this.buildDir}/*/${input.glob}`
                } else {
                    // Output is in custom location - glob from current root
                    globPattern = input.glob;
                }

                // Run glob ONCE to get all matches (resolve to absolute for comparison)
                const matches = await glob(globPattern, { cwd: this.projectDir });
                const matchSet = new Set(matches.map(m => path.resolve(this.projectDir, m)));

                // Filter outputs to only those that match (resolve both sides)
                const filteredOutputs = outputs.filter(outputPath =>
                    matchSet.has(path.resolve(this.projectDir, outputPath))
                );

                if (filteredOutputs.length === 0) {
                    throw new Error(`No files from node "${nodeName}" output "${input.output}" match pattern: ${input.glob}.\nOutputs: ${JSON.stringify(outputs, null, 2)}`);
                }
                outputs = filteredOutputs;
            }

            return outputs
        }

        // Files references (glob patterns or literal paths)
        if (inputIsFilesRef(input)) {
            const results: string[] = [];
            for (const pattern of input.patterns) {
                const matches = await glob(pattern, { cwd: this.projectDir, nodir: true });
                if (matches.length === 0) {
                    // Check if it's a directory to give a better error message
                    const resolved = path.resolve(this.projectDir, pattern);
                    const isDir = await fs.stat(resolved).then(s => s.isDirectory(), () => false);
                    if (isDir) {
                        throw new Error(`files() resolved to a directory: ${pattern}. Use absolute() for directory paths or add a glob pattern (e.g., "${pattern}/**/*").`);
                    }
                    throw new Error(`No files found for pattern: ${pattern}`);
                }
                results.push(...matches.map(m => path.resolve(this.projectDir, m)));
            }
            return results;
        }

        // Collect references (intermediate directory assembled by multiple nodes)
        if (inputIsCollectRef(input)) {
            const matches = await glob(path.join(input.dir, '**/*'), { nodir: true, cwd: this.projectDir });
            return matches.map(m => path.resolve(this.projectDir, m));
        }

        throw new Error(`Unknown input type: ${JSON.stringify(input)}`);
    }

    /**
     * Get the outputs of a specific node after pipeline execution.
     * Returns undefined if the node hasn't run yet or doesn't exist.
     */
    getNodeOutputs(nodeName: string): NodeOutput<any>[] | undefined {
        return this.nodeOutputs.get(nodeName);
    }
}