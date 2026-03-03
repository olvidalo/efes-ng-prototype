import { NodeRegistry } from './nodeRegistry';
import type { XmlRegistrableNode } from './nodeConfigSchema';

import { XsltTransformNode } from '../xml/nodes/xsltTransformNode';
import { CopyFilesNode } from '../io/copyFilesNode';
import { ZipCompressNode } from '../io/zipCompressNode';
import { FlexSearchIndexNode } from '../search/flexSearchIndexNode';
import { AggregateIndexDataNode } from '../aggregation/aggregateIndexDataNode';
import { AggregateSearchDataNode } from '../aggregation/aggregateSearchDataNode';
import { AggregateBibConcordanceNode } from '../aggregation/aggregateBibConcordanceNode';
import { EleventyBuildNode } from '../eleventy/eleventyBuildNode';
import { GenerateEleventyDataNode } from '../eleventy/generateEleventyDataNode';

const builtinNodes: XmlRegistrableNode[] = [
    XsltTransformNode,
    CopyFilesNode,
    ZipCompressNode,
    FlexSearchIndexNode,
    AggregateIndexDataNode,
    AggregateSearchDataNode,
    AggregateBibConcordanceNode,
    EleventyBuildNode,
    GenerateEleventyDataNode,
];

for (const node of builtinNodes) {
    NodeRegistry.register(node);
}
