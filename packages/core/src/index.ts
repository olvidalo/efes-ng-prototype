// Core
export { PipelineNode, from, files, collect, dir, absolutePath, isInput, isAbsolutePath } from './core/pipelineNode';
export type { Input, NodeOutput, NodeOutputReference, FilesRef, CollectRef, DirRef, AbsolutePath, OutputConfig, PipelineNodeConfig } from './core/pipelineNode';
export { Pipeline } from './core/pipeline';
export type { PipelineContext } from './core/pipeline';
export { PipelineWatcher } from './core/watcher';
export { CompositeNode } from './core/compositeNode';
export type { OutputMapping } from './core/compositeNode';

// XSLT nodes
export { XsltTransformNode } from './xml/nodes/xsltTransformNode';
export { CompileStylesheetNode } from './xml/nodes/compileStylesheetNode';
export { SefTransformNode } from './xml/nodes/sefTransformNode';

// I/O nodes
export { CopyFilesNode } from './io/copyFilesNode';
export { ZipCompressNode } from './io/zipCompressNode';

// Search
export { FlexSearchIndexNode } from './search/flexSearchIndexNode';

// Eleventy integration
export { EleventyBuildNode } from './eleventy';

// XML pipeline configuration
export { loadPipelineFromXml } from './core/xmlPipelineLoader';
export { NodeRegistry } from './core/nodeRegistry';
export { generateRngSchema } from './core/rngSchemaGenerator';
export { discoverPipelineFile } from './core/discoverPipelineFile';
export type { PipelineFileInfo } from './core/discoverPipelineFile';
export type { NodeConfigSchema, SchemaField, SchemaFieldType, DescribedNode, ConfigFromSchema } from './core/nodeConfigSchema';
