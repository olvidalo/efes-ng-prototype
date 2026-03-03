import {type PipelineContext, PipelineNode, type PipelineNodeConfig, type OutputConfig} from "../core/pipeline";
import path from "node:path";
import fs from "node:fs/promises";
import type {NodeConfigSchema, ConfigFromSchema} from "../core/nodeConfigSchema";

import FlexSearch, {type DocumentData, type IndexOptions} from 'flexsearch';

const configSchema = {
    documents:   { type: 'input', description: 'Path to a JSON file containing an array of documents to index.' },
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
    static readonly description = 'Build a FlexSearch full-text search index from JSON documents. Produces index files that can be loaded client-side for in-browser search.';

    async run(context: PipelineContext) {
        const jsonFiles = await context.resolveInput(this.config.config.documents);
        if (jsonFiles.length !== 1) {
            throw new Error("FlexSearchIndexNode requires exactly one JSON input file");
        }

        const jsonFile = jsonFiles[0];
        const outputDir = this.config.outputConfig?.to || context.getBuildPath(this.name, jsonFile);

        this.log(context, `Generating FlexSearch index from ${jsonFile}`);

        // Load documents
        const jsonContent = await fs.readFile(jsonFile, 'utf-8');
        const documents = JSON.parse(jsonContent);

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