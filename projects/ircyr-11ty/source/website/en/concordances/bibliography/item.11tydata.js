// Cross-product pagination: generates one page per language × bibliography entry.
module.exports = {
    pagination: {
        data: "indices.bibliography.entries",
        size: 1,
        alias: "item",
        before(entries, fullData) {
            const langs = fullData.languages.codes;
            return entries.flatMap(entry =>
                langs.map(lang => ({ lang, ...entry }))
            );
        }
    }
};
