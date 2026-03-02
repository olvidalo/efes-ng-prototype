// Core
export { Pipeline, PipelineNode, from, files, collect, inputIsNodeOutputReference, inputIsFilesRef, inputIsCollectRef } from './core/pipeline';
export type { Input, NodeOutput, FilesRef, CollectRef, OutputConfig, PipelineNodeConfig, PipelineContext } from './core/pipeline';
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
export { EleventyBuildNode, AggregateIndexDataNode, AggregateSearchDataNode, AggregateBibConcordanceNode } from './eleventy';
