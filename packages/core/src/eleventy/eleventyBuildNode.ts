import {PipelineNode, type PipelineNodeConfig, type OutputConfig, type CollectRef} from "../core/pipelineNode";
import type {PipelineContext} from "../core/pipeline";
import path from "node:path";
import fs from "node:fs/promises";
import {resolveWorkloadPath} from "../core/runtimeHelpers";
import type {NodeConfigSchema, ConfigFromSchema} from "../core/nodeConfigSchema";

const configSchema = {
    sourceDir:       { type: 'input', description: 'The directory containing the assembled Eleventy site (templates, data, content). Must use a collect reference.' },
    passthroughCopy: { type: 'map', optional: true, description: 'Files to copy directly into the Eleventy output without processing (e.g. search data, CSS, images).' },
} as const satisfies NodeConfigSchema;

interface EleventyBuildConfig extends PipelineNodeConfig {
    name: string;
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig?: OutputConfig;
}

const outputKeys = ['built'] as const;

export class EleventyBuildNode extends PipelineNode<EleventyBuildConfig, typeof outputKeys[number]> {
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;
    static readonly description = 'Run Eleventy to build the final static website from the assembled intermediate files. This is typically the last step in the pipeline.';

    constructor(config: EleventyBuildConfig) {
        super(config);

        if (!(this.config.config.sourceDir as CollectRef)?.dir) {
            throw new Error(`EleventyBuildNode "${this.name}" requires sourceDir as a collect() reference`);
        }
    }

    async run(context: PipelineContext) {
        const cfg = await this.resolvedConfig(context);
        // EleventyBuildNode needs the directory path, not the resolved file list
        const sourceDir = path.resolve(context.projectDir, (this.config.config.sourceDir as CollectRef).dir);
        const outputDir = this.getOutputDir(context);

        // Check if source directory exists
        try {
            await fs.access(sourceDir);
        } catch {
            throw new Error(`Source directory not found: ${sourceDir}`);
        }

        await fs.mkdir(outputDir, { recursive: true });

        this.log(context, `Building Eleventy site: ${sourceDir} -> ${outputDir}`);

        const workloadScript = resolveWorkloadPath(import.meta.url, 'eleventyWorkload.mts', 'eleventy/eleventyWorkload.mjs');

        // recycleAfter: Eleventy caches compiled templates in module-level statics
        // (TemplateContent._inputCache, _compileCache) that persist across builds
        // in long-lived worker threads. Recycling the worker after each build
        // ensures a clean slate without disabling the cache (which costs 2-3s).
        const result = await context.workerPool.execute<{ outputDir: string }>({
            workloadScript,
            nodeName: this.name,
            sourcePath: sourceDir,
            sourceDir,
            outputDir,
            passthroughCopy: cfg.passthroughCopy ?? {}
        }, { recycleAfter: true });

        this.log(context, `Eleventy build completed: ${result.outputDir}`);
        return [{ built: [result.outputDir] }];
    }
}
