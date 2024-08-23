import path from 'path';
import process from 'process';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
    plugins: [
        svelte({
            preprocess: [vitePreprocess()],
            compilerOptions: {
                dev: true,
            }
        }),
        renderer(), // adds node polyfills, needed for imports like 'fs' and 'path'
        {
            name: 'remove-src-dir-from-html-path',
            enforce: 'post',
            generateBundle(_, bundle) {
                const htmlFileInSrcFolderPattern = /^index.html$/;
                for (const outputItem of Object.values(bundle)) {
                    if (!htmlFileInSrcFolderPattern.test(outputItem.fileName)) continue;
                    outputItem.fileName = outputItem.fileName.replace('index', 'entry');
                }
            }
        }
    ],
    resolve: {
        alias: {
            '@': path.resolve('src/'),
        },
    },
    build: {
        outDir: './',
        rollupOptions: {
            output: { entryFileNames: 'entry.js' }
        },
        target: 'node22.6.0'
    },
    root: path.resolve(process.cwd(), 'src/'),
    base: './',
});
