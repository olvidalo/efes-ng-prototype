import {
    inputIsNodeOutputReference,
    inputIsFilesRef,
    isAbsolutePath,
    type PipelineContext,
    PipelineNode,
    type PipelineNodeConfig,
    type OutputConfig
} from "../../core/pipeline";
import type {NodeConfigSchema, ConfigFromSchema} from "../../core/nodeConfigSchema";
import path from "node:path";
import { readFile } from "node:fs/promises";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

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
    static readonly xmlElement = 'sefTransform' as const;
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;
    static readonly description = 'Apply a pre-compiled SEF stylesheet to XML source files using Saxon-JS. Supports result-documents, stylesheet parameters, and no-source mode.';

    // Helper: Calculate transformed output path using unified path handling
    private getTransformedPath(item: string, context: PipelineContext): string {
        const config = this.config.outputConfig ?? {};
        // Default extension is .xml for transforms (XSLT standard)
        const defaultExt = config.extension ?? '.xml';
        return this.calculateOutputPath(item, context, config, defaultExt);
    }

    async run(context: PipelineContext) {
        // const startTime = Date.now();

        const sefStylesheetPath = (await context.resolveInput(this.config.config.sefStylesheet))[0];
        // this.log(context, `[DEBUG] SEF stylesheet resolved in ${Date.now() - resolveStartTime}ms: ${sefStylesheetPath}`);

        // this.log(context, `[DEBUG] Loading SEF stylesheet JSON...`);
        // const loadStartTime = Date.now();
        const sefStylesheetJson = await readFile(sefStylesheetPath, 'utf-8')
        const sefStylesheet = JSON.parse(sefStylesheetJson)
        // this.log(context, `[DEBUG] SEF stylesheet loaded in ${Date.now() - loadStartTime}ms`);

        // Handle no-source mode (stylesheet uses document() for input)
        // this.log(context, `[DEBUG] Resolving input items...`);
        // const itemsStartTime = Date.now();
        const sourcePaths = this.config.config.sourceFiles ?
            await context.resolveInput(this.config.config.sourceFiles) :
            [sefStylesheetPath];
        // this.log(context, `[DEBUG] Input items resolved in ${Date.now() - itemsStartTime}ms: ${sourcePaths.length} file(s)`);

        const isNoSourceMode = !this.config.config.sourceFiles;
        // this.log(context, `${isNoSourceMode ? 'Running stylesheet' : `Transforming ${sourcePaths.length} file(s)`} with ${sefStylesheetPath}`);

        // this.log(context, `[DEBUG] Starting withCache processing...`);
        // const cacheStartTime = Date.now();
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
                // this.log(context, `[DEBUG] Transforming item: ${sourcePath}`);
                // const itemStartTime = Date.now();

                const outputPath = this.getTransformedPath(sourcePath, context);
                const baseDir = path.dirname(outputPath);

                // this.log(context, `[DEBUG] Resolving stylesheet params...`);
                // const paramsStartTime = Date.now();
                const stylesheetParams = await this.resolveStylesheetParams(context, sourcePath);
                // this.log(context, `[DEBUG] Stylesheet params resolved in ${Date.now() - paramsStartTime}ms`);

                // Prepare transform options for worker (no callbacks - they're in the worker)
                const transformOptions = {
                    initialTemplate: this.config.config.initialTemplate,
                    stylesheetParams,
                    tunnelParams: this.config.config.tunnelParams,
                    templateParams: this.config.config.templateParams,
                    initialMode: this.config.config.initialMode,
                    outputProperties: this.config.config.serializationParams
                };

                // Execute transform in worker thread
                // Determine workload script path based on environment
                const currentDir = path.dirname(fileURLToPath(import.meta.url));
                const devWorkloadPath = path.resolve(currentDir, '../saxonWorkload.ts');
                const prodWorkloadPath = path.resolve(currentDir, 'xml/saxonWorkload.js');
                const workloadScript = fs.existsSync(prodWorkloadPath) ? prodWorkloadPath : devWorkloadPath;

                // this.log(context, `[DEBUG] Executing transform in worker thread...`);
                // const workerStartTime = Date.now();
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
                // this.log(context, `[DEBUG] Transform completed in ${Date.now() - workerStartTime}ms`);

                this.log(context, `Generated: ${result.outputPath}`);
                for (const docPath of result.resultDocumentPaths) {
                    this.log(context, `Result document: ${docPath}`);
                }

                // this.log(context, `[DEBUG] Item transformation total time: ${Date.now() - itemStartTime}ms`);

                return {
                    outputs: {
                        transformed: [result.outputPath],
                        "result-documents": result.resultDocumentPaths
                    }
                };
            }
        );
        // this.log(context, `[DEBUG] withCache processing completed in ${Date.now() - cacheStartTime}ms`);
        // this.log(context, `[DEBUG] Total run() time: ${Date.now() - startTime}ms`);

        return results.map(r => r.outputs);
    }

    private async resolveStylesheetParams(context: PipelineContext, sourcePath: string): Promise<Record<string, any>> {
        if (!this.config.config.stylesheetParams) return {};

        const resolved: Record<string, any> = {};
        for (const [key, value] of Object.entries(this.config.config.stylesheetParams)) {
            if (typeof value === 'function') {
                resolved[key] = value(sourcePath);
            } else if (inputIsNodeOutputReference(value) || inputIsFilesRef(value)) {
                const resolvedPaths = await context.resolveInput(value);
                const absolutePaths = resolvedPaths.map(p => path.resolve(p));
                resolved[key] = absolutePaths.length === 1 ? absolutePaths[0] : absolutePaths;
            } else if (isAbsolutePath(value)) {
                resolved[key] = path.resolve(value.path);
            } else {
                resolved[key] = typeof value === 'string'
                    ? value.replaceAll('{basename}', path.basename(sourcePath, path.extname(sourcePath)))
                    : value;
            }
        }
        return resolved;
    }
}