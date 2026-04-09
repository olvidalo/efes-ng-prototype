import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        cli: 'src/cli.ts',
        questions: 'src/questions.ts',
    },
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    bundle: true,
    splitting: false,
    sourcemap: true,
    outDir: 'dist',
    external: ['@clack/prompts', 'ejs', 'isomorphic-git', 'isomorphic-git/http/node'],
});
