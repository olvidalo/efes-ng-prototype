import {type CollectRef, type PipelineContext, PipelineNode, type PipelineNodeConfig, type OutputConfig} from "../core/pipeline";
import path from "node:path";
import fs from "node:fs/promises";

// @ts-ignore
import {Eleventy} from '@11ty/eleventy';

interface EleventyBuildConfig extends PipelineNodeConfig {
    name: string;
    config: {
        sourceDir: CollectRef;
        eleventyConfig?: any;
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

        // TODO: Incremental builds — Eleventy supports setIncrementalFile(path) + write()
        // for rebuilding only affected templates. We have mtime-based change detection
        // (snapshotMtimes/diffMtimes) ready but need to investigate why reusing the
        // Eleventy instance across builds doesn't yield speed benefits. Possible issues:
        // - Eleventy re-initializes internal state on each write()
        // - Path format mismatch (absolute vs ./relative) for setIncrementalFile
        // - Need to call elev.init() or similar between builds

        const elev = new Eleventy(sourceDir, outputDir, {
            ...this.config.config.eleventyConfig,
        });

        await elev.write();

        this.log(context, `Eleventy build completed: ${outputDir}`);
        return [{ built: [outputDir] }];
    }
}
