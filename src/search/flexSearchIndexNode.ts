import {type PipelineContext, PipelineNode, type PipelineNodeConfig, type OutputConfig} from "../core/pipeline";
import path from "node:path";
import fs from "node:fs/promises";
import type {NodeConfigSchema, ConfigFromSchema} from "../core/nodeConfigSchema";
import { parseMetadataXml, xpathNodes, xpathString, childElementsToJson } from "../xml/metadataXmlParser";

import FlexSearch, {type DocumentData, type IndexOptions} from 'flexsearch';

const configSchema = {
    documents:   { type: 'input', description: 'Per-document metadata XML files to build search index from.' },
    idField:     { type: 'scalar', description: 'The document field to use as a unique identifier (e.g. "documentId").' },
    textFields:  { type: 'array', description: 'Document fields to include in the full-text search index.' },
    facetFields: { type: 'array', description: 'Document fields to use as facet filters in the search interface.' },
} as const satisfies NodeConfigSchema;

interface FlexSearchIndexConfig extends PipelineNodeConfig {
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig?: OutputConfig;
}

const outputKeys = ['searchIndex'] as const;

export class FlexSearchIndexNode extends PipelineNode<FlexSearchIndexConfig, typeof outputKeys[number]> {
    static readonly xmlElement = 'flexSearchIndex' as const;
    static readonly configSchema = configSchema;
    static readonly outputKeys = outputKeys;
    static readonly description = 'Build a FlexSearch full-text search index from per-document metadata XML files. Produces index files that can be loaded client-side for in-browser search.';

    async run(context: PipelineContext) {
        const metadataFiles = await context.resolveInput(this.config.config.documents);
        if (metadataFiles.length === 0) {
            throw new Error("FlexSearchIndexNode: no input files");
        }

        const outputDir = this.config.outputConfig?.to || context.getBuildPath(this.name, metadataFiles[0]);

        this.log(context, `Generating FlexSearch index from ${metadataFiles.length} metadata files`);

        // Load documents from individual metadata XMLs
        const documents = await this.parseMetadataFiles(metadataFiles, context);

        this.log(context, `Processing ${documents.length} documents`);

        const indexConfig = {
            id: this.config.config.idField,
            store: true,
            index: this.config.config.textFields,
            tag: this.config.config.facetFields,
        }
        const searchIndex = new FlexSearch.Document(indexConfig);

        // Add documents to index
        documents.forEach((doc: any) => {
            const indexDoc = { ...doc };
            // Flatten array values in text fields (FlexSearch expects strings)
            for (const field of this.config.config.textFields) {
                if (Array.isArray(indexDoc[field])) {
                    indexDoc[field] = indexDoc[field].join(' ');
                }
            }
            searchIndex.add(indexDoc);
        });

        // Export and save
        await fs.mkdir(outputDir, { recursive: true });

        // Generate facet counts for JavaScript filtering
        const facets = this.generateFacets(documents);

        // Write facets, metadata, and documents for client-side filtering
        await fs.writeFile(path.join(outputDir, 'facets.json'), JSON.stringify(facets, null, 2));
        await fs.writeFile(path.join(outputDir, 'count.json'), JSON.stringify({ total: documents.length }));
        await fs.writeFile(path.join(outputDir, 'config.json'), JSON.stringify(indexConfig));
        await fs.writeFile(path.join(outputDir, 'documents.json'), JSON.stringify(documents));

        const writtenFiles: string[] = []
        await searchIndex.export(async (key: string, data: any) => {
            await fs.writeFile(path.join(outputDir, key), data, "utf8");
            writtenFiles.push(key)
        });
        await fs.writeFile(path.join(outputDir, 'index.json'), JSON.stringify(writtenFiles, null, 2));

        this.log(context, `FlexSearch index generated: ${outputDir}`);
        return [{ searchIndex: [...writtenFiles, 'facets.json', 'count.json', 'config.json', 'documents.json', 'index.json' ].map(file => path.join(outputDir, file)) }];
    }

    private async parseMetadataFiles(files: string[], context: PipelineContext): Promise<Record<string, any>[]> {
        const documents: Record<string, any>[] = [];

        for (const file of files) {
            const xmlDoc = await parseMetadataXml(file);
            const documentId = xpathString(xmlDoc, 'string(/metadata/documentId)');
            if (!documentId) continue;

            const searchNodes = xpathNodes(xmlDoc, '/metadata/search');
            if (searchNodes.length === 0) continue;

            const doc: Record<string, any> = {
                [this.config.config.idField]: documentId,
                ...childElementsToJson(searchNodes[0]),
            };
            documents.push(doc);
        }

        documents.sort((a, b) => String(a[this.config.config.idField]).localeCompare(String(b[this.config.config.idField])));
        return documents;
    }

    private generateFacets(documents: any[]): Record<string, Record<string, number>> {
        const facets: Record<string, Record<string, number>> = {};

        this.config.config.facetFields?.forEach(field => {
            facets[field] = {};
            documents.forEach(doc => {
                const values = Array.isArray(doc[field]) ? doc[field] : [doc[field]];
                values.forEach((value: string) => {
                    if (value?.trim()) {
                        facets[field][value] = (facets[field][value] || 0) + 1;
                    }
                });
            });
        });

        return facets;
    }
}