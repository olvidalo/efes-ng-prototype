const { I18nPlugin, HtmlBasePlugin } = require('@11ty/eleventy');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function (eleventyConfig) {

    // ── Project settings ──────────────────────────

    // Directories copied as-is (images, CSS, search data, etc.)
    // Add entries here when you add new asset directories.
    eleventyConfig.addPassthroughCopy('assets');
    eleventyConfig.addPassthroughCopy('search-data');

    // ── Framework ─────────────────────────────────

    eleventyConfig.addPlugin(I18nPlugin, {
        defaultLanguage: 'en',
        errorMode: 'allow-fallback',
    });
    eleventyConfig.addPlugin(HtmlBasePlugin);
    eleventyConfig.addFilter('t', createTranslationFilter());

    return {
        pathPrefix: process.env.PATH_PREFIX || '/',
    };
}

function createTranslationFilter() {
    const translationsDir = path.resolve('.', '_data', 'translations');
    const translations = {};
    if (fs.existsSync(translationsDir)) {
        for (const file of fs.readdirSync(translationsDir)) {
            if (!file.endsWith('.json')) continue;
            const lang = file.replace('.json', '');
            try {
                translations[lang] = JSON.parse(
                    fs.readFileSync(path.join(translationsDir, file), 'utf-8')
                );
            } catch { /* skip invalid files */ }
        }
    }

    return function (key, ...args) {
        const lang = this.page?.lang || 'en';
        let value = translations[lang]?.[key]
            ?? translations['en']?.[key]
            ?? `[${key}]`;
        for (const arg of args) {
            value = value.replace('%s', arg);
        }
        return value;
    };
}
