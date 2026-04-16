import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

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
    },
});
