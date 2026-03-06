import {type PipelineContext, PipelineNode, type PipelineNodeConfig, type OutputConfig} from "../../core/pipeline";
import type {NodeConfigSchema, ConfigFromSchema} from "../../core/nodeConfigSchema";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { resolveWorkloadPath } from "../../core/resolveWorkloadPath";

// @ts-ignore
import {getResource, XPath} from 'saxonjs-he';

const configSchema = {
    stylesheets: { type: 'input', description: 'XSLT files to compile to SEF format.' },
    stubLibPath: { type: 'input', optional: true, description: 'Path to a stub XSLT library JSON that provides empty templates for unavailable imports.' },
} as const satisfies NodeConfigSchema;

interface CompileStylesheetConfig extends PipelineNodeConfig {
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig?: OutputConfig;
}

const outputKeys = ['compiledStylesheet'] as const;

export class CompileStylesheetNode extends PipelineNode<CompileStylesheetConfig, typeof outputKeys[number]> {
    static readonly xmlElement = 'compileStylesheet' as const;
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;
    static readonly description = 'Compile XSLT stylesheets to Saxon Executable Format (SEF) for fast runtime execution.';

    /**
     * Normalize SEF JSON before hashing by stripping buildDateTime.
     * Saxon-JS compilation is non-deterministic — each compilation produces a
     * different buildDateTime even for identical input. Normalizing ensures
     * cross-node cache sharing works correctly for downstream consumers.
     */
    async hashOutputFile(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath, 'utf-8');
        const sef = JSON.parse(content);
        // Saxon-JS embeds non-deterministic metadata in compiled SEFs:
        // - buildDateTime: compilation timestamp
        // - Σ, Σ2: checksums that vary per compilation
        delete sef.buildDateTime;
        delete sef['Σ'];
        delete sef['Σ2'];
        const normalized = JSON.stringify(sef);
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    // Helper: Calculate compiled output path using unified path handling
    private getCompiledPath(item: string, context: PipelineContext): string {
        const config = this.config.outputConfig ?? {};
        return this.getItemOutputPath(item, context, config, '.sef.json');
    }

    async run(context: PipelineContext) {
        const cfg = await this.resolvedConfig(context);
        const xsltPaths = cfg.stylesheets;
        const resolvedStubLibPath = cfg.stubLibPath?.[0];

        const results = await this.withCache<"compiledStylesheet">(
            context,
            xsltPaths,
            (item) => item,
            (item, outputKey, filename?): string | undefined => {
                if (outputKey === "compiledStylesheet") {
                    return this.getCompiledPath(item, context);
                }
                throw new Error(`Unknown output key: ${outputKey}`);
            },
            async (item) => {
                const outputPath = this.getCompiledPath(item, context);

                this.log(context, `Compiling ${item} to ${outputPath}`);

                // Extract XSLT dependencies before compilation
                const discoveredDependencies = await this.extractXsltDependencies(item);
                this.log(context, `Found ${discoveredDependencies.length} dependencies: ${JSON.stringify(discoveredDependencies)}`);

                try {
                    const workloadScript = resolveWorkloadPath(import.meta.url, '../compileWorkload.ts', 'xml/compileWorkload.js');

                    // Execute compilation in worker thread
                    const result = await context.workerPool.execute<{
                        outputPath: string;
                    }>({
                        workloadScript,
                        nodeName: this.name,
                        xsltPath: item,
                        outputPath,
                        stubLibPath: resolvedStubLibPath
                    });

                    this.log(context, `Compiled: ${result.outputPath}`);

                    return {
                        outputs: {
                            compiledStylesheet: [result.outputPath]
                        },
                        discoveredDependencies
                    };
                } catch (err: any) {
                    throw new Error(`Failed to compile XSL: ${err.message}`);
                }
            }
        );

        return results.map(r => r.outputs);
    }

    private async extractXsltDependencies(xsltPath: string): Promise<string[]> {
        const allDependencies = new Set<string>();
        const processed = new Set<string>();

        async function processFile(filePath: string) {
            if (processed.has(filePath)) return;
            processed.add(filePath);

            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const doc = await getResource({text: content, type: 'xml'});

                // Use XPath to find xsl:import and xsl:include elements
                const imports = XPath.evaluate("//(xsl:import|xsl:include)/@href/data(.)", doc, {
                    namespaceContext: {xsl: 'http://www.w3.org/1999/XSL/Transform'},
                    resultForm: 'array'
                });

                for (const href of imports) {
                    const resolvedPath = path.resolve(path.dirname(filePath), href);
                    allDependencies.add(resolvedPath);
                    await processFile(resolvedPath); // Recursively process dependencies
                }
            } catch (error) {
                console.warn(`Could not parse XSLT dependencies from ${filePath}:`, error);
            }
        }

        await processFile(xsltPath);
        return Array.from(allDependencies);
    }
}