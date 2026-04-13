import type { WorkloadModule, WorkerLog } from "../core/runtimeHelpers";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
// @ts-ignore
import SaxonJS from "saxonjs-he";

// Initialize extensions once when module is loaded
// Register the kiln:url-for-match function implementation
SaxonJS.registerExtensionFunctions({
    "namespace": "http://www.kcl.ac.uk/artshums/depts/ddh/kiln/ns/1.0",
    "signatures": {
        "url-for-match": {
            "as": "xs:string",
            "param": ["xs:string", "xs:string*", "xs:integer"],
            "arity": [3],
            "impl":  function(matchId: string, params: any, priority: number): string {
                // Simple implementation: generate static URLs based on parameters
                // matchId is like 'local-epidoc-display-html'
                // params is an iterator of [language, filename]
                const paramArray = Array.from(params);
                // TODO: debug logging
                // console.log(`url-for-match(${matchId}, ${paramArray}, ${priority})`);
                const language = paramArray[0] || 'en';
                const filename = paramArray[1] || 'unknown';

                const routePatterns: Record<string, string> = {
                    'local-epidoc-display-html': `/${language}/inscriptions/${filename}.html`,
                    'local-epidoc-display-xml': `/${language}/xml/${filename}.xml`,
                    'local-epidoc-zip': `/${language}/inscriptions.zip`,
                    'local-epidoc-index-display': `/${language}/inscriptions/`,
                    'local-tei-display-html': `/${language}/texts/${filename}.html`,
                    'local-home-page': `/${language}/`,
                    'local-concordance-bibliography': `/${language}/concordances/bibliography/`,
                    'local-concordance-bibliography-item': `/${language}/concordances/bibliography/${filename}.html`,
                    'local-index-display-html': `/${language}/indices/${paramArray[1]}/${paramArray[2]}.html`,
                    'local-search': `/${language}/search/`,
                    'local-indices-type-display': `/${language}/indices/${filename}`,
                };

                const url = routePatterns[matchId];
                if (!url) {
                    throw new Error(`Unknown matchId passed to kiln:url-for-match: ${matchId}`);
                }

                return url
            }
        }
    }
});


const platform = SaxonJS.internals.getPlatform();

export interface TransformJob {
    nodeName: string;
    sourcePath: string | null;  // null for no-source transforms
    sefStylesheetPath: string;
    stylesheetInternal: any
    outputPath: string;
    baseDir: string;
    transformOptions: {
        initialTemplate?: string;
        stylesheetParams?: Record<string, any>;
        templateParams?: Record<string, any>;
        initialMode?: string;
        outputProperties?: Record<string, any>;
    };
}

export interface TransformResult {
    outputPath: string;
    resultDocumentPaths: string[];
}

export async function performWork(job: TransformJob, log: WorkerLog): Promise<TransformResult> {
    const transformOptions: any = {
        // stylesheetFileName: job.sefStylesheetPath,
        stylesheetInternal: job.stylesheetInternal,
        destination: "serialized",
        // Handle XSLT collection() function calls
        collectionFinder: (uri: string) => {
            const collectionPath = uri.startsWith('file:')
                ? fileURLToPath(uri)
                : decodeURI(uri);
            const files = fsSync.globSync(collectionPath, { cwd: job.baseDir });
            return files.map(file => {
                const absFile = path.resolve(job.baseDir, file);
                const content = fsSync.readFileSync(absFile, 'utf-8');
                let doc;
                try {
                    doc = platform.parseXmlFromString(content);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    throw new Error(`Failed to parse ${path.basename(absFile)}: ${message}`);
                }
                // Set the document URI property that SaxonJS uses for document-uri()
                (doc as any)._saxonDocUri = pathToFileURL(absFile).href;
                return doc;
            });
        },
        // Configure xsl:result-document outputs
        deliverResultDocument: () => ({
            destination: "serialized",
        }),
        ...job.transformOptions
    };

    // Add source file if not no-source mode
    if (job.sourcePath) {
        try {
            const sourceNode = await SaxonJS.getResource({
                location: pathToFileURL(job.sourcePath).href, type: 'xml'
            })
            transformOptions.sourceNode = sourceNode;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to parse ${path.basename(job.sourcePath)}: ${message}`);
        }
    }

    let result
    try {
        result = await SaxonJS.transform(transformOptions);
    } catch (error) {
        const stylesheet = path.basename(job.sefStylesheetPath, ".sef.json");
        const source = job.sourcePath ? path.basename(job.sourcePath) : null;
        const context = source ? `${source} with ${stylesheet}` : stylesheet;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${context}: ${message}`);
    }

    // Write principal result
    await fs.mkdir(path.dirname(job.outputPath), { recursive: true });
    await fs.writeFile(job.outputPath, result.principalResult);

    // Handle result documents (xsl:result-document outputs)
    const resultDocumentPaths: string[] = [];
    if (result.resultDocuments) {
        for (const [uri, content] of Object.entries(result.resultDocuments)) {
            // uri contains XSLT-relative path
            const relativePath = uri.startsWith('file:') ? fileURLToPath(uri) : uri;
            const docPath = path.normalize(path.join(job.baseDir, relativePath));

            // Security: ensure result stays within node's build directory
            if (!docPath.startsWith(job.baseDir)) {
                throw new Error(`Result-document path escapes build directory: ${relativePath}`);
            }

            await fs.mkdir(path.dirname(docPath), { recursive: true });
            await fs.writeFile(docPath, content as string);
            resultDocumentPaths.push(docPath);
        }
    }

    const transformResult: TransformResult = {
        outputPath: job.outputPath,
        resultDocumentPaths
    };

    return transformResult;
}

({ performWork }) satisfies WorkloadModule;
