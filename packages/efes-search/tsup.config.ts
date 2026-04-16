import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

const scaffoldDir = '../create-efes-ng/templates/source/website/assets/efes-search';

export default defineConfig({
    entry: { 'efes-search': 'src/index.js' },
    format: ['esm'],
    platform: 'browser',
    bundle: true,
    splitting: false,
    minify: false,
    sourcemap: true,
    outDir: 'dist',
    outExtension: () => ({ js: '.js' }),
    noExternal: ['flexsearch'],
    onSuccess: () => {
        copyFileSync('src/efes-search.css', 'dist/efes-search.css');
        // Keep scaffold templates in sync with built output
        copyFileSync('dist/efes-search.js', `${scaffoldDir}/efes-search.js`);
        copyFileSync('dist/efes-search.css', `${scaffoldDir}/efes-search.css`);
    },
});
