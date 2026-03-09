import { PipelineNode, type PipelineNodeConfig, type OutputConfig } from "../../core/pipelineNode";
import type { PipelineContext } from "../../core/pipeline";
import type {NodeConfigSchema, ConfigFromSchema} from "../../core/nodeConfigSchema";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { resolveWorkloadPath } from "../../core/resolveWorkloadPath";

const configSchema = {
    sourceFiles:         { type: 'input', optional: true, description: 'Source XML files to transform. If omitted, the stylesheet runs in no-source mode (e.g. using document() for input).' },
    sefStylesheet:       { type: 'input', description: 'Pre-compiled SEF stylesheet to apply.' },
    initialTemplate:     { type: 'scalar', optional: true, description: 'Named template to invoke instead of applying templates to source files.' },
    stylesheetParams:    { type: 'map', optional: true, description: 'Parameters passed to the stylesheet via xsl:param.' },
    tunnelParams:        { type: 'map', optional: true, description: 'Tunnel parameters passed through to descendant templates.' },
    templateParams:      { type: 'map', optional: true, description: 'Parameters passed to the initial template.' },
    serializationParams: { type: 'map', optional: true, description: 'Override the stylesheet output serialization settings.' },
    initialMode:         { type: 'scalar', optional: true, description: 'Initial processing mode to use when applying templates.' },
} as const satisfies NodeConfigSchema;

interface SefTransformConfig extends PipelineNodeConfig {
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig?: OutputConfig;
}

const outputKeys = ['transformed', 'result-documents'] as const;

export class SefTransformNode extends PipelineNode<SefTransformConfig, typeof outputKeys[number]> {
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;
    static readonly description = 'Apply a pre-compiled SEF stylesheet to XML source files using Saxon-JS. Supports result-documents, stylesheet parameters, and no-source mode.';

    // Helper: Calculate transformed output path using unified path handling
    private getTransformedPath(item: string, context: PipelineContext): string {
        const config = this.config.outputConfig ?? {};
        // Default extension is .xml for transforms (XSLT standard)
        const defaultExt = config.extension ?? '.xml';
        return this.getItemOutputPath(item, context, config, defaultExt);
    }

    async run(context: PipelineContext) {
        const startTime = Date.now();
        const cfg = await this.resolvedConfig(context);

        const sefStylesheetPath = cfg.sefStylesheet[0];
        const sefStylesheetJson = await readFile(sefStylesheetPath, 'utf-8')
        const sefStylesheet = JSON.parse(sefStylesheetJson)

        const isNoSourceMode = !this.config.config.sourceFiles;
        const sourcePaths = isNoSourceMode
            ? [sefStylesheetPath]
            : cfg.sourceFiles!;
        this.debug(context, `${isNoSourceMode ? 'Running stylesheet' : `Transforming ${sourcePaths.length} file(s)`} with ${sefStylesheetPath}`);

        const cacheStartTime = Date.now();
        const results = await this.withCache<"transformed" | "result-documents">(
            context,
            sourcePaths,
            (item) => isNoSourceMode ? `no-source-${sefStylesheetPath}` : `${item}-with-${sefStylesheetPath}`,
            (item, outputKey, filename?): string | undefined => {
                if (outputKey === "transformed") {
                    return this.getTransformedPath(item, context);
                }
                else if (outputKey === "result-documents") {
                    // Without filename: can't recalculate, return undefined (use cached structure)
                    if (!filename) {
                        return undefined;
                    }

                    // With filename: can calculate path (used during performWork)
                    const transformedPath = this.getTransformedPath(item, context);
                    const baseDir = path.dirname(transformedPath);
                    const resultPath = path.normalize(path.join(baseDir, filename));

                    // Security: ensure result stays within node's build directory
                    if (!resultPath.startsWith(baseDir)) {
                        throw new Error(`Result-document path escapes build directory: ${filename}`);
                    }

                    return resultPath;
                }
                throw new Error(`Unknown output key: ${outputKey}`);
            },
            async (sourcePath) => {
                const itemStartTime = Date.now();

                const outputPath = this.getTransformedPath(sourcePath, context);
                const baseDir = path.dirname(outputPath);

                const stylesheetParams = this.applyItemSubstitutions(
                    cfg.stylesheetParams ?? {}, sourcePath
                );

                const transformOptions = {
                    initialTemplate: cfg.initialTemplate,
                    stylesheetParams,
                    tunnelParams: cfg.tunnelParams ?? {},
                    templateParams: cfg.templateParams ?? {},
                    initialMode: cfg.initialMode,
                    outputProperties: cfg.serializationParams ?? {}
                };

                // Execute transform in worker thread
                const workloadScript = resolveWorkloadPath(import.meta.url, '../saxonWorkload.ts', 'xml/saxonWorkload.js');

                const workerStartTime = Date.now();
                const result = await context.workerPool.execute<{
                    outputPath: string;
                    resultDocumentPaths: string[];
                }>({
                    workloadScript,
                    nodeName: this.name,
                    sourcePath: isNoSourceMode ? null : sourcePath,
                    sefStylesheetPath,
                    stylesheetInternal: sefStylesheet,
                    outputPath,
                    baseDir,
                    transformOptions
                });
                this.debug(context, `Transform completed in ${Date.now() - workerStartTime}ms`);

                this.log(context, `Generated: ${result.outputPath}`);
                for (const docPath of result.resultDocumentPaths) {
                    this.log(context, `Result document: ${docPath}`);
                }

                this.debug(context, `Item total: ${Date.now() - itemStartTime}ms`);

                return {
                    outputs: {
                        transformed: [result.outputPath],
                        "result-documents": result.resultDocumentPaths
                    }
                };
            }
        );
        this.debug(context, `withCache: ${Date.now() - cacheStartTime}ms, total: ${Date.now() - startTime}ms`);

        return results.map(r => r.outputs);
    }

    /** Apply per-item template substitutions to already-resolved stylesheet params. */
    private applyItemSubstitutions(params: Record<string, any>, sourcePath: string): Record<string, any> {
        const result = { ...params };
        const basename = path.basename(sourcePath, path.extname(sourcePath));
        for (const [key, value] of Object.entries(result)) {
            if (typeof value === 'function') {
                result[key] = value(sourcePath);
            } else if (typeof value === 'string') {
                result[key] = value.replaceAll('{basename}', basename);
            }
        }
        return result;
    }
}