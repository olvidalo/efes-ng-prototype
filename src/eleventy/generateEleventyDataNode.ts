import {
    type PipelineContext,
    PipelineNode,
    type PipelineNodeConfig,
    type NodeOutput,
    type OutputConfig
} from "../core/pipeline";
import path from "node:path";
import fs from "node:fs/promises";
import type {NodeConfigSchema, ConfigFromSchema} from "../core/nodeConfigSchema";

const configSchema = {
    metadataFiles: { type: 'input' },
    excludeFields: { type: 'array', optional: true },
} as const satisfies NodeConfigSchema;

interface GenerateEleventyDataConfig extends PipelineNodeConfig {
    name: string;
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig?: OutputConfig;
}

const DEFAULT_EXCLUDE_FIELDS = ['entities', 'search'];

/**
 * Generates slim .11tydata.json files from full metadata files by stripping
 * heavy fields (entities, search data) that Eleventy doesn't need.
 *
 * This dramatically reduces the data Eleventy loads into its data cascade,
 * yielding ~37% faster builds.
 */
const outputKeys = ['eleventyData'] as const;

export class GenerateEleventyDataNode extends PipelineNode<
    GenerateEleventyDataConfig,
    typeof outputKeys[number]
> {
    static readonly xmlElement = 'generateEleventyData' as const;
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;

    async run(context: PipelineContext): Promise<NodeOutput<"eleventyData">[]> {
        const files = await context.resolveInput(this.config.config.metadataFiles);
        const excludeFields = this.config.config.excludeFields ?? DEFAULT_EXCLUDE_FIELDS;
        const outputDir = this.config.outputConfig?.to;
        const fromPrefix = this.config.outputConfig?.from;

        if (!outputDir) {
            throw new Error(`GenerateEleventyDataNode "${this.name}" requires outputConfig.to`);
        }

        this.log(context, `Generating slim Eleventy data from ${files.length} metadata files (excluding: ${excludeFields.join(', ')})`);

        const outputPaths: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const content = JSON.parse(await fs.readFile(file, "utf-8"));

                // Strip excluded fields
                for (const field of excludeFields) {
                    delete content[field];
                }

                // Compute output path: strip fromPrefix, change extension, prepend outputDir
                let relativePath = path.basename(file);
                if (fromPrefix) {
                    const resolvedFrom = path.resolve(context.projectDir, fromPrefix);
                    const resolvedFile = path.resolve(file);
                    if (resolvedFile.startsWith(resolvedFrom)) {
                        relativePath = resolvedFile.slice(resolvedFrom.length + 1);
                    }
                }

                // Change extension from .metadata.json to .11tydata.json
                relativePath = relativePath.replace(/\.metadata\.json$/, '.11tydata.json');

                const outputPath = path.resolve(context.projectDir, outputDir, relativePath);
                await fs.mkdir(path.dirname(outputPath), { recursive: true });
                await fs.writeFile(outputPath, JSON.stringify(content, null, 2));
                outputPaths.push(outputPath);
            } catch (err) {
                this.log(context, `Warning: Failed to process ${file}: ${err}`);
            }
            context.progress(this.name, i + 1, files.length);
        }

        this.log(context, `Generated ${outputPaths.length} slim Eleventy data files`);

        return [{ eleventyData: outputPaths }];
    }
}
