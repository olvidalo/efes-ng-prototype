import {XsltTransformNode, Pipeline, collect, files, from, CopyFilesNode, EleventyBuildNode, GenerateEleventyDataNode, AggregateIndexDataNode, AggregateBibConcordanceNode, AggregateSearchDataNode, FlexSearchIndexNode} from "efes-ng-phase-2-poc";


// We copy the eleventy site files to the intermediate directory so that they can be used as input for the Eleventy build.
// In the next step, we add the transformed EpiDoc XML files as HTML partials to the inscription directory.
const copyEleventySite = new CopyFilesNode({
    name: "copy-eleventy-site",
    config: {
        sourceFiles: files("1-input/eleventy-site/**/*")
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site",
        from: "1-input/eleventy-site"
    }
})

// Transforms the EpiDoc XML files into HTML partials using the EpiDoc stylesheets.
// Outputs them to the inscription directory of the intermediate eleventy-site directory.
const transformEpiDoc = new XsltTransformNode({
    name: "transform-epidoc",
    config: {
        sourceFiles: files('1-input/inscriptions/*.xml'),
        stylesheet: files("1-input/epidoc-stylesheets/start-edition.xsl"),
        initialTemplate: "inslib-body-structure",
        stylesheetParams: {
            "parm-edition-type": "interpretive",
            "parm-edn-structure": "inslib",
            "parm-external-app-style": "inslib",
            "parm-internal-app-style": "none",
            "parm-leiden-style": "panciera",
            "parm-line-inc": "5",
            "parm-verse-lines": "on",
        }
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/en/inscriptions",
        from: "1-input/inscriptions",
        extension: ".html"
    }
})

// Extracts metadata from each EpiDoc XML source file to a JSON file.
// Contains all extracted data: entities, search facets, and page metadata.
const extractEpidocMetadata = new XsltTransformNode({
    name: "extract-epidoc-metadata",
    config: {
        sourceFiles: files("1-input/inscriptions/*.xml"),
        stylesheet: files("1-input/stylesheets/create-11ty-frontmatter-for-epidoc.xsl")
    },
    outputConfig: {
        extension: ".metadata.json"
    }
})

// Generates slim .11tydata.json files for Eleventy by stripping heavy entity/search data.
const generateEleventyData = new GenerateEleventyDataNode({
    name: "generate-eleventy-data",
    config: {
        metadataFiles: from(extractEpidocMetadata, "transformed"),
    },
    outputConfig: {
        from: "1-input/inscriptions/**/*.json",
        to: "2-intermediate/eleventy-site/en/inscriptions"
    }
});

// Aggregates entity data from all metadata files into index data files.
const aggregateIndices = new AggregateIndexDataNode({
    name: "aggregate-indices",
    config: {
        metadataFiles: from(extractEpidocMetadata, "transformed"),
        indicesConfigFile: files("1-input/indices-config.xsl")
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/_data/indices"
    }
});

// Aggregates bibliography data from all metadata files into a concordance JSON file.
const aggregateBibConcordance = new AggregateBibConcordanceNode({
    name: "aggregate-bib-concordance",
    config: {
        metadataFiles: from(extractEpidocMetadata, "transformed"),
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/_data/concordance"
    }
});

// Aggregates search data from all metadata files into a single search-documents.json.
const aggregateSearchData = new AggregateSearchDataNode({
    name: "aggregate-search-data",
    config: {
        metadataFiles: from(extractEpidocMetadata, "transformed"),
    },
    outputConfig: { to: "2-intermediate/search-data" }
});

// Builds a FlexSearch index + facets from the aggregated search data.
const buildSearchIndex = new FlexSearchIndexNode({
    name: "build-search-index",
    config: {
        documents: from(aggregateSearchData, "searchData"),
        idField: "documentId",
        textFields: ["fullText", "title"],
        facetFields: ["material", "objectType", "textType", "language", "findspot", "repository"]
    },
    outputConfig: { to: "2-intermediate/eleventy-site/search-data" }
});

// Calls Eleventy to build the site and outputs the result to the output directory.
const eleventyBuild = new EleventyBuildNode({
    name: 'eleventy-build',
    config: {
        sourceDir: collect('2-intermediate/eleventy-site'),
        passthroughCopy: {
            "2-intermediate/eleventy-site/search-data": "search-data",
            "2-intermediate/eleventy-site/assets": "assets",
        },
    },
    outputConfig: {
        to: '3-output',
    },
});


export default new Pipeline("IRCyR Eleventy", ".efes-build", ".efes-cache", "dynamic")
    .addNode(transformEpiDoc)
    .addNode(extractEpidocMetadata)
    .addNode(generateEleventyData)
    .addNode(aggregateIndices)
    .addNode(aggregateBibConcordance)
    .addNode(aggregateSearchData)
    .addNode(buildSearchIndex)
    .addNode(copyEleventySite)
    .addNode(eleventyBuild);
