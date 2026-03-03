import {from, type PipelineNodeConfig, type OutputConfig} from "../../core/pipeline";
import {CompositeNode} from "../../core/compositeNode";
import {CompileStylesheetNode} from "./compileStylesheetNode";
import {SefTransformNode} from "./sefTransformNode";
import type {NodeConfigSchema, ConfigFromSchema} from "../../core/nodeConfigSchema";

const configSchema = {
    sourceFiles:         { type: 'input', optional: true },
    stylesheet:          { type: 'input' },
    initialTemplate:     { type: 'scalar', optional: true },
    stylesheetParams:    { type: 'map', optional: true },
    tunnelParams:        { type: 'map', optional: true },
    templateParams:      { type: 'map', optional: true },
    serializationParams: { type: 'map', optional: true },
    initialMode:         { type: 'scalar', optional: true },
    stubLibPath:         { type: 'input', optional: true },
} as const satisfies NodeConfigSchema;

interface XsltTransformConfig extends PipelineNodeConfig {
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig?: OutputConfig;
}

export class XsltTransformNode extends CompositeNode<XsltTransformConfig, "transformed" | "result-documents" | "compiledStylesheet"> {
    static readonly xmlElement = 'xsltTransform' as const;
    static readonly configSchema = configSchema;

    protected buildInternalNodes(): void {
        const compileName = `${this.name}:compile`;
        const transformName = `${this.name}:transform`;


        const compile = new CompileStylesheetNode({
            name: compileName,
            config: {
                stylesheets: this.config.config.stylesheet,
                stubLibPath: this.config.config.stubLibPath,
            },
        })

        const transform = new SefTransformNode({
            name: transformName,
            config: {
                sourceFiles: this.config.config.sourceFiles,
                sefStylesheet: from(compile, "compiledStylesheet"),
                initialTemplate: this.config.config.initialTemplate,
                stylesheetParams: this.config.config.stylesheetParams,
                templateParams: this.config.config.templateParams,
                serializationParams: this.config.config.serializationParams,
                initialMode: this.config.config.initialMode,
            },
            outputConfig: this.config.outputConfig,
        })

        this.internalNodes = [compile, transform]

        this.outputMappings = {
            "transformed": { node: transform.name, output: "transformed"},
            "result-documents": { node: transform.name, output: "result-documents"},
            "compiledStylesheet": { node: compile.name, output: "compiledStylesheet"},
        }
    }
}
