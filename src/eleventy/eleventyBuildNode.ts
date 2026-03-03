import {type CollectRef, type PipelineContext, PipelineNode, type PipelineNodeConfig, type OutputConfig} from "../core/pipeline";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import {fileURLToPath} from "node:url";

interface EleventyBuildConfig extends PipelineNodeConfig {
    name: string;
    config: {
        sourceDir: CollectRef;
        passthroughCopy?: Record<string, string>[];
    };
    outputConfig?: OutputConfig;
}

export class EleventyBuildNode extends PipelineNode<EleventyBuildConfig, "built"> {
    constructor(config: EleventyBuildConfig) {
        super(config);

        if (!this.config.config.sourceDir?.dir) {
            throw new Error(`EleventyBuildNode "${this.name}" requires sourceDir as a collect() reference`);
        }
    }

    async run(context: PipelineContext) {
        const sourceDir = path.resolve(context.projectDir, this.config.config.sourceDir.dir);
        const outputDir = this.config.outputConfig?.to ?
            path.resolve(context.projectDir, this.config.outputConfig.to) :
            context.getBuildPath(this.name, sourceDir);

        // Check if source directory exists
        try {
            await fs.access(sourceDir);
        } catch {
            throw new Error(`Source directory not found: ${sourceDir}`);
        }

        await fs.mkdir(outputDir, { recursive: true });

        this.log(context, `Building Eleventy site: ${sourceDir} -> ${outputDir}`);

        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const devWorkloadPath = path.resolve(currentDir, 'eleventyWorkload.ts');
        const prodWorkloadPath = path.resolve(currentDir, 'eleventy/eleventyWorkload.js');
        const workloadScript = fsSync.existsSync(prodWorkloadPath) ? prodWorkloadPath : devWorkloadPath;

        const result = await context.workerPool.execute<{ outputDir: string }>({
            workloadScript,
            nodeName: this.name,
            sourcePath: sourceDir,
            sourceDir,
            outputDir,
            passthroughCopy: this.config.config.passthroughCopy
        });

        this.log(context, `Eleventy build completed: ${result.outputDir}`);
        return [{ built: [result.outputDir] }];
    }
}
