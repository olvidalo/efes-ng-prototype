import { NodeRegistry } from './nodeRegistry';
import type { XmlRegistrableNode } from './nodeConfigSchema';

import { XsltTransformNode } from '../xml/nodes/xsltTransformNode';
import { CompileStylesheetNode } from '../xml/nodes/compileStylesheetNode';
import { SefTransformNode } from '../xml/nodes/sefTransformNode';
import { CopyFilesNode } from '../io/copyFilesNode';
import { ZipCompressNode } from '../io/zipCompressNode';
import { FlexSearchIndexNode } from '../search/flexSearchIndexNode';
import { EleventyBuildNode } from '../eleventy/eleventyBuildNode';

const builtinNodes: XmlRegistrableNode[] = [
    XsltTransformNode,
    CompileStylesheetNode,
    SefTransformNode,
    CopyFilesNode,
    ZipCompressNode,
    FlexSearchIndexNode,
    EleventyBuildNode,
];

for (const node of builtinNodes) {
    NodeRegistry.register(node);
}
