import {type PipelineNodeConfig, PipelineNode, type OutputConfig} from "../core/pipelineNode";
import type {PipelineContext} from "../core/pipeline";
import {copyFile, mkdir, stat, constants} from "node:fs/promises";
import path from "node:path";
import type {NodeConfigSchema, ConfigFromSchema} from "../core/nodeConfigSchema";

const configSchema = {
    sourceFiles: { type: 'input', description: 'Source files to process. Accepts a glob pattern or a node output reference.' },
} as const satisfies NodeConfigSchema;

interface CopyFilesConfig extends PipelineNodeConfig {
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig: OutputConfig & {
        overwrite?: boolean;
    };
}

const outputKeys = ['copied'] as const;

export class CopyFilesNode extends PipelineNode<CopyFilesConfig, typeof outputKeys[number]> {
    static readonly xmlElement = 'copyFiles' as const;
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;
    static readonly description = 'Copy files from source to destination, preserving directory structure. Requires an output element with a "to" attribute.';

    async run(context: PipelineContext) {
        const cfg = await this.resolvedConfig(context);
        const paths = cfg.sourceFiles;
        const copiedFiles: string[] = [];

        // Validate that output directory is specified
        if (!this.config.outputConfig?.to) {
            throw new Error(`CopyFilesNode "${this.name}" requires outputConfig.to to be specified`);
        }

        for (let i = 0; i < paths.length; i++) {
            const sourcePath = paths[i];
            const destPath = this.getItemOutputPath(sourcePath, context, this.config.outputConfig, undefined);
            const sourceStat = await stat(sourcePath);

            if (!sourceStat.isFile()) {
                context.progress(this.name, i + 1, paths.length);
                continue;
            }

            await mkdir(path.dirname(destPath), { recursive: true });

            if (!this.config.outputConfig.overwrite) {
                try {
                    const destStat = await stat(destPath);
                    if (destStat.mtimeMs >= sourceStat.mtimeMs) {
                        copiedFiles.push(destPath);
                        context.progress(this.name, i + 1, paths.length);
                        continue;
                    }
                } catch (error: any) {
                    if (error?.code !== 'ENOENT') throw error;
                }
            }

            await copyFile(sourcePath, destPath, constants.COPYFILE_FICLONE);
            copiedFiles.push(destPath);
            this.log(context, `Copied: ${sourcePath} → ${destPath}`);
            context.progress(this.name, i + 1, paths.length);
        }

        return [{ copied: copiedFiles }];
    }
}