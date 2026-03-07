import {type PipelineNodeConfig, PipelineNode, type OutputConfig} from "../core/pipelineNode";
import type {PipelineContext} from "../core/pipeline";
import {Zip, ZipPassThrough} from "fflate";
import {createReadStream, createWriteStream} from "node:fs";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import type {NodeConfigSchema, ConfigFromSchema} from "../core/nodeConfigSchema";

const configSchema = {
    files: { type: 'input', description: 'Files to include in the ZIP archive. Accepts a glob pattern or a node output reference.' },
} as const satisfies NodeConfigSchema;

interface ZipCompressConfig extends PipelineNodeConfig {
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig: OutputConfig;
}

const outputKeys = ['zip'] as const;

export class ZipCompressNode extends PipelineNode<ZipCompressConfig, typeof outputKeys[number]> {
    static readonly xmlElement = 'zipCompress' as const;
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;
    static readonly description = 'Compress files into a single ZIP archive. Requires an output element with a "filename" attribute.';

    constructor(config: ZipCompressConfig) {
        super(config);
        if (!this.config.outputConfig?.outputFilename) {
            throw new Error(`ZipCompressNode "${this.name}" requires outputConfig.outputFilename to be specified`);
        }
    }

    async run(context: PipelineContext) {
        const cfg = await this.resolvedConfig(context);
        const inputPaths = cfg.files;

        const outputDir = this.getOutputDir(context);
        const filename = typeof this.config.outputConfig!.outputFilename === 'function'
            ? this.config.outputConfig!.outputFilename('')
            : this.config.outputConfig!.outputFilename!;
        const zipPath = path.join(outputDir, filename);

        const outputs = await this.withCacheAggregate(
            context,
            () => `zip-all-${inputPaths.length}-files`,
            () => zipPath,
            async () => {

                await mkdir(path.dirname(zipPath), {recursive: true});

                const zip = new Zip();
                const outputStream = createWriteStream(zipPath);

                // Promisify the zip output
                const finished = new Promise<void>((resolve, reject) => {
                    zip.ondata = (err, data, final) => {
                        if (err) return reject(err);
                        outputStream.write(data);
                        if (final) {
                            outputStream.end();
                            resolve();
                        }
                    };
                });

                // Add each file - use unified path handling for entry names
                for (const filePath of inputPaths) {
                    // Use unified config for entry path calculation (but no extension change)
                    const entryConfig = {
                        ...this.config.outputConfig,
                        to: undefined,  // Don't add output dir to entry paths
                        outputFilename: undefined  // Don't override filename
                    };
                    const entryPath = this.getItemOutputPath(filePath, context, entryConfig, undefined);
                    const entryName = entryPath;

                    this.log(context, `Adding: ${entryName}`);

                    const file = new ZipPassThrough(entryName);
                    zip.add(file);

                    // Promisify stream reading (default is Buffer mode, no encoding)
                    await new Promise<void>((resolve, reject) => {
                        createReadStream(filePath)
                            .on('data', (chunk: string | Buffer) => file.push(new Uint8Array(<Buffer>chunk)))
                            .on('end', () => { file.push(new Uint8Array(0), true); resolve(); })
                            .on('error', reject);
                    });
                }

                zip.end();
                await finished;

                this.log(context, `Created: ${zipPath} (${inputPaths.length} files)`);

                return { outputs: { zip: [zipPath] } };
            }
        );

        return [outputs];
    }
}