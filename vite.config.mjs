import path from 'path';
import process from 'process';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [
        svelte({preprocess: [vitePreprocess()]}),
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
        target: 'esnext'
    },
    root: path.resolve(process.cwd(), 'src/'),
    base: './',
});
