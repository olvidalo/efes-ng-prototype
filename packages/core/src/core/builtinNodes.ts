import { NodeRegistry } from './nodeRegistry';
import type { DescribedNode } from './nodeConfigSchema';

import { XsltTransformNode } from '../xml/nodes/xsltTransformNode';
import { CompileStylesheetNode } from '../xml/nodes/compileStylesheetNode';
import { SefTransformNode } from '../xml/nodes/sefTransformNode';
import { CopyFilesNode } from '../io/copyFilesNode';
import { ZipCompressNode } from '../io/zipCompressNode';
import { FlexSearchIndexNode } from '../search/flexSearchIndexNode';
import { EleventyBuildNode } from '../eleventy/eleventyBuildNode';

const builtinNodes: Record<string, DescribedNode> = {
    xsltTransform: XsltTransformNode,
    compileStylesheet: CompileStylesheetNode,
    sefTransform: SefTransformNode,
    copyFiles: CopyFilesNode,
    zipCompress: ZipCompressNode,
    flexSearchIndex: FlexSearchIndexNode,
    eleventyBuild: EleventyBuildNode,
};

for (const [name, nodeClass] of Object.entries(builtinNodes)) {
    NodeRegistry.register(name, nodeClass);
}
