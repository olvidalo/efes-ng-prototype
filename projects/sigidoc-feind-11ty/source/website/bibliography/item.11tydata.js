// Cross-product pagination: generates one page per language × bibliography entry.
// Alternative: use per-language wrapper templates (item-en.njk, item-de.njk, item-el.njk)
// that each set the language and include a shared partial.
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
