const sveltePreprocess = require('svelte-preprocess');

module.exports = {
    // Consult https://github.com/sveltejs/svelte-preprocess
    // for more information about preprocessors
    preprocess: sveltePreprocess(),
    
    // Other Svelte options can be added here
    // For example:
    // compilerOptions: {
    //   dev: process.env.NODE_ENV !== 'production'
    // }
};

