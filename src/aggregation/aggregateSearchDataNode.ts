import {
    type PipelineContext,
    PipelineNode,
    type PipelineNodeConfig,
    type NodeOutput,
    type OutputConfig
} from "../core/pipeline";
import path from "node:path";
import fs from "node:fs/promises";
import type {NodeConfigSchema, ConfigFromSchema} from "../core/nodeConfigSchema";

const configSchema = {
    metadataFiles:  { type: 'input' },
    languageLabels: { type: 'map', optional: true },
} as const satisfies NodeConfigSchema;

interface AggregateSearchDataNodeConfig extends PipelineNodeConfig {
    name: string;
    config: ConfigFromSchema<typeof configSchema>;
    outputConfig?: OutputConfig;
}

const DEFAULT_LANGUAGE_LABELS: Record<string, string> = {
    grc: "Ancient Greek",
    la: "Latin",
    "grc-Latn": "Transliterated Greek"
};

function parseYear(val: string): number | null {
    if (!val) return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
}

/**
 * Aggregates search data from individual frontmatter files into a single
 * search-documents.json file for FlexSearch indexing.
 */
export class AggregateSearchDataNode extends PipelineNode<
    AggregateSearchDataNodeConfig,
    "searchData"
> {
    static readonly xmlElement = 'aggregateSearchData' as const;
    static readonly configSchema = configSchema;

    async run(context: PipelineContext): Promise<NodeOutput<"searchData">[]> {
        const files = await context.resolveInput(this.config.config.metadataFiles);
        const outputDir = this.config.outputConfig?.to ??
            context.getBuildPath(this.name, "search");
        const languageLabels = this.config.config.languageLabels ?? DEFAULT_LANGUAGE_LABELS;

        this.log(context, `Aggregating search data from ${files.length} metadata files`);

        const documents: Record<string, any>[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const content = JSON.parse(await fs.readFile(file, "utf-8"));
                const documentId = content.documentId;

                if (!documentId) continue;

                const search = content.search;
                if (!search) {
                    this.log(context, `Warning: No search data in ${file}`);
                    continue;
                }

                // Pull standard fields from content root
                const doc: Record<string, any> = {
                    documentId,
                    title: content.title || "",
                    origDate: content.origDate || "",
                    findspot: content.findspot || "",
                };

                // Merge all search fields (project-agnostic pass-through)
                for (const [key, value] of Object.entries(search)) {
                    if (key === 'dateNotBefore' || key === 'dateNotAfter') {
                        doc[key] = parseYear(String(value));
                    } else if (key === 'language') {
                        if (Array.isArray(value)) {
                            doc[key] = (value as string[]).map(v => languageLabels[String(v)] || String(v));
                        } else {
                            doc[key] = languageLabels[String(value)] || String(value) || "";
                        }
                    } else {
                        doc[key] = value;
                    }
                }

                documents.push(doc);
            } catch (err) {
                this.log(context, `Warning: Failed to parse ${file}: ${err}`);
            }
            context.progress(this.name, i + 1, files.length);
        }

        // Sort by documentId for consistent output
        documents.sort((a, b) => a.documentId.localeCompare(b.documentId));

        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, "search-documents.json");
        await fs.writeFile(outputPath, JSON.stringify(documents, null, 2));

        this.log(context, `Generated search data: ${documents.length} documents`);

        return [{ searchData: [outputPath] }];
    }
}
