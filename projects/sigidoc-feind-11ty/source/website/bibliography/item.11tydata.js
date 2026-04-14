// Cross-product pagination: generates one page per bibliography entry x language.
// Each entry in the data is expanded into N items (one per language), so Eleventy
// produces /en/bibliography/{id}/, /de/bibliography/{id}/, etc.
module.exports = {
    pagination: {
        data: "indices.bibliography.entries",
        size: 1,
        alias: "item",
        before(entries, fullData) {
            const langs = fullData.languages?.codes || ['en'];
            return entries.flatMap(entry =>
                langs.map(lang => ({ lang, ...entry }))
            );
        }
    }
};
