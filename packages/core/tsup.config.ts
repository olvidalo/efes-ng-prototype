import { defineConfig } from 'tsup';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const scaffoldSchema = '../create-efes-ng/templates/efes-ng.rng';

export default defineConfig({
    // Framework — Node library + CLI + workers
        entry: {
            index: 'src/index.ts',
            cli: 'src/cli.ts',
            genericWorker: 'src/xml/genericWorker.mts',
            'xml/saxonWorkload': 'src/xml/saxonWorkload.mts',
            'xml/compileWorkload': 'src/xml/compileWorkload.mts',
            'eleventy/eleventyWorkload': 'src/eleventy/eleventyWorkload.mts',
            'eleventy/eleventyRunner': 'src/eleventy/eleventyRunner.mts',
        },
        format: ['esm'],
        platform: 'node',
        target: 'node22',
        bundle: true,
        splitting: false,
        dts: { entry: { index: 'src/index.ts' } },
        sourcemap: true,
        clean: true,
        treeshake: true,
        outDir: 'dist',
        external: ['saxonjs-he', 'xslt3-he', '@11ty/eleventy', '@11ty/eleventy-utils'],
        onSuccess: () => {
            // Keep scaffold schema in sync with node registry
            const rng = execFileSync('node', ['dist/cli.mjs', 'schema'], { encoding: 'utf-8' });
            writeFileSync(scaffoldSchema, rng);
        },
});
