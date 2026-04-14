import { I18nPlugin } from '@11ty/eleventy';
import fs from 'node:fs';
import path from 'node:path';

export default function (eleventyConfig) {
    eleventyConfig.addPlugin(I18nPlugin, {
        defaultLanguage: 'en',
        errorMode: 'allow-fallback',
    });

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

    // Translation filter: {{ "seals" | t }}
    // Resolves from page.lang, falls back to English, then to the raw key in brackets.
    eleventyConfig.addFilter('t', function (key) {
        const lang = this.page?.lang || 'en';
        return translations[lang]?.[key]
            ?? translations['en']?.[key]
            ?? `[${key}]`;
    });
}
