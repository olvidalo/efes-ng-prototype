import fs from 'node:fs';
import path from 'node:path';
import type { Pipeline } from './pipeline';
import { loadPipelineFromXml } from './xmlPipelineLoader';

export interface PipelineFileInfo {
    filePath: string;
    format: 'ts' | 'xml';
}

/**
 * Scan a project directory for a pipeline definition file.
 * Looks for pipeline.xml or pipeline.ts (preferred), falling back to *.pipeline.xml / *.pipeline.ts.
 * Errors on ambiguity (both formats) or absence.
 */
export function discoverPipelineFile(dir: string): PipelineFileInfo {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) {
        throw new Error(`Project directory not found: ${absDir}`);
    }

    // Prefer canonical names: pipeline.xml / pipeline.ts
    const xmlCanonical = path.resolve(absDir, 'pipeline.xml');
    const tsCanonical = path.resolve(absDir, 'pipeline.ts');
    const hasXmlCanonical = fs.existsSync(xmlCanonical);
    const hasTsCanonical = fs.existsSync(tsCanonical);

    if (hasXmlCanonical && hasTsCanonical) {
        throw new Error(
            `Ambiguous pipeline config: found both pipeline.ts and pipeline.xml. ` +
            `Remove one to resolve the ambiguity.`
        );
    }
    if (hasXmlCanonical) {
        return { filePath: xmlCanonical, format: 'xml' };
    }
    if (hasTsCanonical) {
        return { filePath: tsCanonical, format: 'ts' };
    }

    // Fallback: legacy *.pipeline.ts / *.pipeline.xml
    const entries = fs.readdirSync(absDir);
    const tsFiles = entries.filter(f => f.endsWith('.pipeline.ts'));
    const xmlFiles = entries.filter(f => f.endsWith('.pipeline.xml'));

    if (tsFiles.length > 1) {
        throw new Error(`Multiple TS pipeline files found: ${tsFiles.join(', ')}`);
    }
    if (xmlFiles.length > 1) {
        throw new Error(`Multiple XML pipeline files found: ${xmlFiles.join(', ')}`);
    }
    if (tsFiles.length === 1 && xmlFiles.length === 1) {
        throw new Error(
            `Ambiguous pipeline config: found both ${tsFiles[0]} and ${xmlFiles[0]}. ` +
            `Remove one to resolve the ambiguity.`
        );
    }

    if (tsFiles.length === 1) {
        return { filePath: path.resolve(absDir, tsFiles[0]), format: 'ts' };
    }
    if (xmlFiles.length === 1) {
        return { filePath: path.resolve(absDir, xmlFiles[0]), format: 'xml' };
    }

    throw new Error(`No pipeline definition found in ${absDir}`);
}

/**
 * Discover and load a pipeline from a project directory.
 * Returns the Pipeline instance with projectDir set.
 */
export async function discoverPipeline(dir: string): Promise<Pipeline> {
    const { filePath, format } = discoverPipelineFile(dir);
    const absDir = path.resolve(dir);

    if (format === 'xml') {
        const pipeline = await loadPipelineFromXml(filePath);
        pipeline.projectDir = absDir;
        return pipeline;
    }

    const mod = await import(filePath);
    const pipeline = mod.default;

    const { Pipeline: PipelineClass } = await import('./pipeline');
    if (!(pipeline instanceof PipelineClass)) {
        throw new Error(`${path.basename(filePath)} must export default a Pipeline instance`);
    }

    pipeline.projectDir = absDir;
    return pipeline;
}
