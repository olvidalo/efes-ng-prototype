import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { CacheManager } from "./cache";
import type { Pipeline, PipelineContext } from "./pipeline";

// --- Input types (tracked file dependencies) ---

export type FilesRef = { type: 'files', patterns: string[] };
export type NodeOutputReference = { type: 'from', node: PipelineNode<any, any> | string, output: string, glob?: string };
export type CollectRef = { type: 'collect', dir: string };
export type Input = FilesRef | NodeOutputReference | CollectRef;

/** Check whether a value is a pipeline Input reference. */
export function isInput(value: any): value is Input {
    return typeof value === 'object' && value !== null
        && (value.type === 'files' || value.type === 'from' || value.type === 'collect');
}

export function files(...patterns: string[]): FilesRef {
    return { type: 'files', patterns };
}

export function collect(dir: string): CollectRef {
    return { type: 'collect', dir };
}

// AbsolutePath: a project-relative path that should be resolved to an absolute path at runtime.
// Unlike files(), this is not a dependency reference — it's just path resolution. No glob, no tracking.
// Use for directory paths or other non-file references passed as string values (e.g. XSLT params).
// For file references, prefer files() which also tracks the file for cache invalidation.
export type AbsolutePath = { type: 'absolute', path: string };

export function absolutePath(p: string): AbsolutePath {
    return { type: 'absolute', path: p };
}

export function isAbsolutePath(value: any): value is AbsolutePath {
    return typeof value === 'object' && value !== null && value?.type === 'absolute';
}
export type NodeOutput<TKey extends string> = Record<TKey, string[]>;

export function from<TNode extends PipelineNode<any, TOutput>, TOutput extends string>(
    node: TNode,
    output: TOutput,
    glob?: string
): NodeOutputReference;
export function from(nodeName: string, output: string, glob?: string): NodeOutputReference;
export function from(nodeOrName: PipelineNode<any, any> | string, output: string, glob?: string): NodeOutputReference {
    return { type: 'from', node: nodeOrName, output, glob };
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

    /** Log a debug message — only visible when pipeline runs in verbose mode. */
    protected debug(context: PipelineContext, message: string): void {
        context.debug(`  [${this.name}] ${message}`);
    }

    /** Absolute path to this node's output directory. Always resolved against projectDir. */
    protected getOutputDir(context: PipelineContext): string {
        return context.getNodeOutputDir(this.name);
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
        if (isInput(value)) {
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
    protected getItemOutputPath(
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

        // Input references
        if (isInput(value)) {
            switch (value.type) {
                case 'files':   return `files(${value.patterns.join(',')})`;
                case 'from': {
                    const globPart = value.glob ? `:${value.glob}` : '';
                    const nodeName = typeof value.node === 'string' ? value.node : value.node.name;
                    return `from(${nodeName}:${value.output}${globPart})`;
                }
                case 'collect': return `collect(${value.dir})`;
                default: value satisfies never;
            }
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

        this.debug(context, `Cache lookup (signature: ${deps.contentSignature})`);

        // Phase 1: Sequential cache validation
        const results: Array<{ item: string, outputs: NodeOutput<TOutput>, cached: boolean }> = [];
        const misses: Array<{ index: number, item: string, cacheKey: string }> = [];

        let completed = 0;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const cached = await this.tryFromCache(context, item, cacheKeys[i], deps, getOutputPath, hashFile);
            if (cached) {
                this.debug(context, `Skipping: ${item} (cached)`);
                completed++;
                context.progress(this.name, completed, items.length);
                results[i] = { item, outputs: cached as NodeOutput<TOutput>, cached: true };
            } else {
                misses.push({ index: i, item, cacheKey: cacheKeys[i] });
            }
        }

        // Phase 2: Parallel work dispatch for all misses
        if (misses.length > 0) {
            this.debug(context, `Processing ${misses.length} cache misses`);
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
        const { hits, total } = this.cacheStats;
        if (hits > 0 && hits < total) {
            this.log(context, `${hits}/${total} cached, processing ${total - hits}`);
        } else if (hits === 0 && total > 1) {
            this.log(context, `Processing ${total} items`);
        }
        return results;
    }

    /**
     * Caching for aggregate nodes that produce a single output from many inputs.
     * Wraps withCache() with a single synthetic item — all config inputs are
     * tracked as shared dependencies, so any input change triggers a rebuild.
     */
    protected async withCacheAggregate<TOutput extends string>(
        context: PipelineContext,
        getCacheKey: () => string,
        getOutputPath: (outputKey: TOutput) => string | undefined,
        performWork: () => Promise<{
            outputs: Record<TOutput, string[]>;
            discoveredDependencies?: string[];
        }>
    ): Promise<NodeOutput<TOutput>> {
        const results = await this.withCache(
            context,
            ['__aggregate__'],
            () => getCacheKey(),
            (_, outputKey) => getOutputPath(outputKey),
            () => performWork()
        );
        return results[0].outputs;
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
            if (isInput(rawValue)) {
                const paths = Array.isArray(resolvedValue) ? resolvedValue : [resolvedValue];
                switch (rawValue.type) {
                    case 'files':
                    case 'collect':
                        configDependencyPaths.push(...paths);
                        break;
                    case 'from': {
                        configDependencyPaths.push(...paths);
                        const upstreamName = typeof rawValue.node === 'string' ? rawValue.node : rawValue.node.name;
                        upstreamResolved.set(upstreamName, { ref: rawValue, paths });
                        const upstreamNode = context.getNodeInstance(upstreamName);
                        for (const p of paths) {
                            pathToProducer.set(p, upstreamNode);
                        }
                        break;
                    }
                    default: rawValue satisfies never;
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
            this.debug(context, `Pre-computing hashes for ${sharedDependencyPaths.length} shared dependencies`);
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
        const invalidReason = await context.cache.isValid(cached, context.resolveInput.bind(context), hashFile);
        if (invalidReason) {
            this.debug(context, `cache miss: ${invalidReason}`);
            return null;
        }

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
