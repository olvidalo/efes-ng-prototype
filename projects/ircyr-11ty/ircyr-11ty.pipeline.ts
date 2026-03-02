import {XsltTransformNode} from "../../src/xml/nodes/xsltTransformNode";
import {collect, files, from, Pipeline} from "../../src/core/pipeline";
import {CopyFilesNode} from "../../src/io/copyFilesNode";
import {EleventyBuildNode, AggregateIndexDataNode, AggregateBibConcordanceNode, AggregateSearchDataNode} from "../../src/eleventy";
import {FlexSearchIndexNode} from "../../src/search/flexSearchIndexNode";


// We copy the eleventy site files to the intermediate directory so that they can be used as input for the Eleventy build.
// In the next step, we add the transformed EpiDoc XML files as HTML partials to the inscription directory.
const copyEleventySite = new CopyFilesNode({
    name: "copy-eleventy-site",
    config: {
        sourceFiles: files("1-input/eleventy-site/**/*")
    },
    outputConfig: {
        outputDir: "2-intermediate/eleventy-site",
        stripPathPrefix: "1-input/eleventy-site"
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
        outputDir: "2-intermediate/eleventy-site/en/inscriptions",
        stripPathPrefix: "1-input/inscriptions",
        extension: ".html"
    }
})

// Extracts metadata from each EpiDoc XML source file to a JSON companion file.
// Now also extracts entity data (persons, abbreviations, etc.) for index aggregation.
const createEpiDoc11tyFrontmatter = new XsltTransformNode({
    name: "create-epidoc-11ty-frontmatter",
    config: {
        sourceFiles: files("1-input/inscriptions/*.xml"),
        stylesheet: files("1-input/stylesheets/create-11ty-frontmatter-for-epidoc.xsl")
    },
    outputConfig: {
        outputDir: "2-intermediate/eleventy-site/en/inscriptions",
        stripPathPrefix: "1-input/inscriptions",
        extension: ".11tydata.json"
    }
})

// Aggregates entity data from all frontmatter files into index data files.
const aggregateIndices = new AggregateIndexDataNode({
    name: "aggregate-indices",
    config: {
        frontmatterFiles: from(createEpiDoc11tyFrontmatter, "transformed"),
        indicesConfigFile: files("1-input/indices-config.xsl")
    },
    outputConfig: {
        outputDir: "2-intermediate/eleventy-site/_data/indices"
    }
});

// Aggregates bibliography data from all frontmatter files into a concordance JSON file.
const aggregateBibConcordance = new AggregateBibConcordanceNode({
    name: "aggregate-bib-concordance",
    config: {
        frontmatterFiles: from(createEpiDoc11tyFrontmatter, "transformed"),
    },
    outputConfig: {
        outputDir: "2-intermediate/eleventy-site/_data/concordance"
    }
});

// Aggregates search data from all frontmatter files into a single search-documents.json.
const aggregateSearchData = new AggregateSearchDataNode({
    name: "aggregate-search-data",
    config: {
        frontmatterFiles: from(createEpiDoc11tyFrontmatter, "transformed"),
    },
    outputConfig: { outputDir: "2-intermediate/eleventy-site/_data/search" }
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
    outputConfig: { outputDir: "2-intermediate/eleventy-site/search-data" }
});

// Calls Eleventy to build the site and outputs the result to the output directory.
const eleventyBuild = new EleventyBuildNode({
    name: 'eleventy-build',
    config: {
        sourceDir: collect('2-intermediate/eleventy-site'),
        eleventyConfig: {
            config: (eleventyConfig: any) => {
                eleventyConfig.addPassthroughCopy({
                    "2-intermediate/eleventy-site/search-data": "search-data",
                });
                eleventyConfig.addPassthroughCopy({
                    "2-intermediate/eleventy-site/assets": "assets",
                });
            }
        },
    },
    outputConfig: {
        outputDir: '3-output',
    },
});


export default new Pipeline("IRCyR Eleventy", ".efes-build", ".efes-cache", "dynamic")
    .addNode(transformEpiDoc)
    .addNode(createEpiDoc11tyFrontmatter)
    .addNode(aggregateIndices)
    .addNode(aggregateBibConcordance)
    .addNode(aggregateSearchData)
    .addNode(buildSearchIndex)
    .addNode(copyEleventySite)
    .addNode(eleventyBuild);
