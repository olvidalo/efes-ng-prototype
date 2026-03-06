import {from, type PipelineNodeConfig, type OutputConfig} from "../../core/pipelineNode";
import {CompositeNode} from "../../core/compositeNode";
import {CompileStylesheetNode} from "./compileStylesheetNode";
import {SefTransformNode} from "./sefTransformNode";
import type {NodeConfigSchema, ConfigFromSchema} from "../../core/nodeConfigSchema";

const configSchema = {
    sourceFiles:         { type: 'input', optional: true, description: 'Source files to process. Accepts a glob pattern or a node output reference.' },
    stylesheet:          { type: 'input', description: 'The XSLT stylesheet to apply.' },
    initialTemplate:     { type: 'scalar', optional: true, description: 'Named template to invoke instead of applying templates to source files (e.g. for generating a single output).' },
    stylesheetParams:    { type: 'map', optional: true, description: 'Parameters passed to the stylesheet via xsl:param.' },
    tunnelParams:        { type: 'map', optional: true, description: 'Tunnel parameters passed through to descendant templates.' },
    templateParams:      { type: 'map', optional: true, description: 'Parameters passed to the initial template.' },
    serializationParams: { type: 'map', optional: true, description: 'Override the stylesheet output serialization settings.' },
    initialMode:         { type: 'scalar', optional: true, description: 'Initial processing mode to use when applying templates.' },
    stubLibPath:         { type: 'input', optional: true, description: 'Path to a stub XSLT library that provides empty templates for unavailable imports.' },
} as const satisfies NodeConfigSchema;

interface XsltTransformConfig extends PipelineNodeConfig {
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig?: OutputConfig;
}

const outputKeys = ['transformed', 'result-documents', 'compiledStylesheet'] as const;

export class XsltTransformNode extends CompositeNode<XsltTransformConfig, typeof outputKeys[number]> {
    static readonly xmlElement = 'xsltTransform' as const;
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;
    static readonly description = 'Apply an XSLT stylesheet to XML source files using Saxon-JS (XSLT 3.0). The stylesheet is automatically compiled to SEF format.';

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
