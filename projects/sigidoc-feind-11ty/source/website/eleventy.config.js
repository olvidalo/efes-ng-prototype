import { I18nPlugin, HtmlBasePlugin } from '@11ty/eleventy';
import fs from 'node:fs';
import path from 'node:path';

export default function (eleventyConfig) {
    eleventyConfig.addPlugin(I18nPlugin, {
        defaultLanguage: 'en',
        errorMode: 'allow-fallback',
    });

    // Rewrites absolute URLs in HTML output to respect pathPrefix (for subdirectory deployment)
    eleventyConfig.addPlugin(HtmlBasePlugin);

    // Load flat translation files from _data/translations/*.json
    const translationsDir = path.resolve('.', '_data', 'translations');
    const translations = {};
    if (fs.existsSync(translationsDir)) {
        for (const file of fs.readdirSync(translationsDir)) {
            if (!file.endsWith('.json')) continue;
            const lang = file.replace('.json', '');
            try {
                translations[lang] = JSON.parse(fs.readFileSync(path.join(translationsDir, file), 'utf-8'));
            } catch { /* skip invalid files */ }
        }
    }

    // Translation filter: {{ "seals" | t }} or {{ "resultCount" | t(123) }}
    // Supports %s placeholders: "Found %s seals" | t(42) → "Found 42 seals"
    // Resolves from page.lang, falls back to English, then to the raw key in brackets.
    eleventyConfig.addFilter('t', function (key, ...args) {
        const lang = this.page?.lang || 'en';
        let value = translations[lang]?.[key]
            ?? translations['en']?.[key]
            ?? `[${key}]`;
        for (const arg of args) {
            value = value.replace('%s', arg);
        }
        return value;
    });

    return {
        pathPrefix: process.env.PATH_PREFIX || '/',
    };
}
