import fs from 'node:fs';
import path from 'node:path';

export interface PipelineFileInfo {
    filePath: string;
    format: 'ts' | 'xml';
}

/**
 * Scan a project directory for a pipeline definition file.
 * Supports both *.pipeline.ts and *.pipeline.xml.
 * Errors on ambiguity (both formats) or absence.
 */
export function discoverPipelineFile(dir: string): PipelineFileInfo {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) {
        throw new Error(`Project directory not found: ${absDir}`);
    }

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

    throw new Error(`No *.pipeline.ts or *.pipeline.xml found in ${absDir}`);
}
