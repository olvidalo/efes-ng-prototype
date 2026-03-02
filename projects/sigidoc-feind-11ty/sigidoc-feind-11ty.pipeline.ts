import {XsltTransformNode} from "../../src/xml/nodes/xsltTransformNode";
import {collect, files, from, Pipeline} from "../../src/core/pipeline";
import {CopyFilesNode} from "../../src/io/copyFilesNode";
import {EleventyBuildNode, AggregateIndexDataNode, AggregateBibConcordanceNode, AggregateSearchDataNode} from "../../src/eleventy";
import {FlexSearchIndexNode} from "../../src/search/flexSearchIndexNode";

// Authority files referenced by XSLT document() calls
const geographyFile = files('1-input/authority/geography.xml');
const dignitiesFile = files('1-input/authority/dignities.xml');
const officesFile = files('1-input/authority/offices.xml');
const invocationsFile = files('1-input/authority/invocation.xml');
const bibliographyFile = files('1-input/authority/bibliography.xml');

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


// The SigiDoc source files contain data in three different languages: German, English, and Greek.
// We have to create static pages for each language.

// ---- ENGLISH ----
// We use the stylesheet prune-to-language derived from EFES/Kiln to prune the EpiDoc XML files to only include
// the data for one language. The language is specified as a parameter to the stylesheet.
const pruneEpidocEnglish = new XsltTransformNode({
    name: "prune-epidoc-english",
    config: {
        sourceFiles: files('1-input/feind-collection/*.xml'),
        stylesheet: files("1-input/stylesheets/prune-to-language.xsl"),
        stylesheetParams: {
            language: 'en',
        }
    }
})

// Transforms the generated English SigiDoc XML files into HTML partials using the SigiDoc stylesheets.
// Outputs them to the inscription directory of the intermediate eleventy-site directory.
const transformEpiDocEnglish = new XsltTransformNode({
    name: "transform-epidoc-en",
    config: {
        sourceFiles: from(pruneEpidocEnglish, "transformed"),
        stylesheet: files("1-input/stylesheets/epidoc-to-html.xsl"),
        stylesheetParams: {
            language: 'en',
        }
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/en/seals",
        from: "1-input/feind-collection",
        extension: ".html"
    }
})

// Extracts metadata from each English SigiDoc XML source file to a JSON
// companion file as metadata for Eleventy that it can use to generate the inscription navigation and the inscription
// list. Outputs the JSON files to the inscription directory of the intermediate eleventy-site directory, alongside the
// HTML partials.

const createEpiDoc11tyFrontmatterEnglish = new XsltTransformNode({
    name: "create-epidoc-11ty-frontmatter-en",
    config: {
        sourceFiles: from(pruneEpidocEnglish, "transformed"),
        stylesheet: files("1-input/stylesheets/create-11ty-frontmatter-for-sigidoc.xsl"),
        stylesheetParams: {
            language: 'en',
            'geography-file': geographyFile,
            'dignities-file': dignitiesFile,
            'offices-file': officesFile,
            'invocations-file': invocationsFile,
            'bibliography-file': bibliographyFile,
        }
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/en/seals",
        from: "1-input/feind-collection",
        extension: ".11tydata.json"
    }
})


// ---- GERMAN ----
// (same workflow as for English)

const pruneEpidocGerman = new XsltTransformNode({
    name: "prune-epidoc-german",
    config: {
        sourceFiles: files('1-input/feind-collection/*.xml'),
        stylesheet: files("1-input/stylesheets/prune-to-language.xsl"),
        stylesheetParams: {
            language: 'de',
        }
    }
})

const transformEpiDocGerman = new XsltTransformNode({
    name: "transform-epidoc-de",
    config: {
        sourceFiles: from(pruneEpidocGerman, "transformed"),
        stylesheet: files("1-input/stylesheets/epidoc-to-html.xsl"),
        stylesheetParams: {
            language: 'de',
        }
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/de/seals",
        from: "1-input/feind-collection",
        extension: ".html"
    }
})

const createEpiDoc11tyFrontmatterGerman = new XsltTransformNode({
    name: "create-epidoc-11ty-frontmatter-de",
    config: {
        sourceFiles: from(pruneEpidocGerman, "transformed"),
        stylesheet: files("1-input/stylesheets/create-11ty-frontmatter-for-sigidoc.xsl"),
        stylesheetParams: {
            language: 'de',
            'geography-file': geographyFile,
            'dignities-file': dignitiesFile,
            'offices-file': officesFile,
            'invocations-file': invocationsFile,
            'bibliography-file': bibliographyFile,
        }
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/de/seals",
        from: "1-input/feind-collection",
        extension: ".11tydata.json"
    }
})


// ---- GREEK ----
// (same workflow as for English)

const pruneEpidocGreek = new XsltTransformNode({
    name: "prune-epidoc-greek",
    config: {
        sourceFiles: files('1-input/feind-collection/*.xml'),
        stylesheet: files("1-input/stylesheets/prune-to-language.xsl"),
        stylesheetParams: {
            language: 'el',
        }
    }
})

const transformEpiDocGreek = new XsltTransformNode({
    name: "transform-epidoc-el",
    config: {
        sourceFiles: from(pruneEpidocGreek, "transformed"),
        stylesheet: files("1-input/stylesheets/epidoc-to-html.xsl"),
        stylesheetParams: {
            language: 'el',
        }
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/el/seals",
        from: "1-input/feind-collection",
        extension: ".html"
    }
})

const createEpiDoc11tyFrontmatterGreek = new XsltTransformNode({
    name: "create-epidoc-11ty-frontmatter-el",
    config: {
        sourceFiles: from(pruneEpidocGerman, "transformed"),
        stylesheet: files("1-input/stylesheets/create-11ty-frontmatter-for-sigidoc.xsl"),
        stylesheetParams: {
            language: 'el',
            'geography-file': geographyFile,
            'dignities-file': dignitiesFile,
            'offices-file': officesFile,
            'invocations-file': invocationsFile,
            'bibliography-file': bibliographyFile,
        }
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/el/seals",
        from: "1-input/feind-collection",
        extension: ".11tydata.json"
    }
})


// ---- INDEX AGGREGATION ----

// Aggregates entity data from English frontmatter files into per-index JSON files.
// We only use English frontmatter since entities are the same across languages.
const aggregateIndices = new AggregateIndexDataNode({
    name: "aggregate-indices",
    config: {
        frontmatterFiles: from(createEpiDoc11tyFrontmatterEnglish, "transformed"),
        indicesConfigFile: files("1-input/indices-config.xsl")
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/_data/indices"
    }
});

// Aggregates bibliography data from English frontmatter files into a concordance JSON file.
const aggregateBibConcordance = new AggregateBibConcordanceNode({
    name: "aggregate-bib-concordance",
    config: {
        frontmatterFiles: from(createEpiDoc11tyFrontmatterEnglish, "transformed"),
    },
    outputConfig: {
        to: "2-intermediate/eleventy-site/_data/concordance"
    }
});


// ---- SEARCH DATA ----

// Aggregates search data from English frontmatter files into search-documents.json.
// We only use English frontmatter since search data is language-independent.
const aggregateSearchData = new AggregateSearchDataNode({
    name: "aggregate-search-data",
    config: {
        frontmatterFiles: from(createEpiDoc11tyFrontmatterEnglish, "transformed"),
    },
    outputConfig: { to: "2-intermediate/eleventy-site/_data/search" }
});

// Builds a FlexSearch index + facets from the aggregated search data.
const buildSearchIndex = new FlexSearchIndexNode({
    name: "build-search-index",
    config: {
        documents: from(aggregateSearchData, "searchData"),
        idField: "documentId",
        textFields: ["fullText", "title"],
        facetFields: [
            "material", "objectType", "language",
            "personalNames", "familyNames", "gender", "milieu",
            "placeNames", "dignities",
            "civilOffices", "ecclesiasticalOffices", "militaryOffices",
            "collection", "metrical", "monogram"
        ]
    },
    outputConfig: { to: "2-intermediate/eleventy-site/search-data" }
});


// ---- FINAL ASSEMBLY ----

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
        to: '3-output',
    },
});


export default new Pipeline("SigiDoc Feind", ".efes-build", ".efes-cache", "dynamic")
    .addNode(pruneEpidocEnglish)
    .addNode(transformEpiDocEnglish)
    .addNode(createEpiDoc11tyFrontmatterEnglish)

    .addNode(pruneEpidocGerman)
    .addNode(transformEpiDocGerman)
    .addNode(createEpiDoc11tyFrontmatterGerman)

    .addNode(pruneEpidocGreek)
    .addNode(transformEpiDocGreek)
    .addNode(createEpiDoc11tyFrontmatterGreek)

    .addNode(copyEleventySite)
    .addNode(aggregateIndices)
    .addNode(aggregateBibConcordance)
    .addNode(aggregateSearchData)
    .addNode(buildSearchIndex)
    .addNode(eleventyBuild);
