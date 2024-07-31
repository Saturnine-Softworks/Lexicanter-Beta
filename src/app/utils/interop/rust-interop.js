const { ipcRenderer } = require('electron');

/**
 * @param {string} name The name of the function to be called.
 * @param  {...any} args The arguments that the function takes.
 * @description Wrapper for asynchronous IPC invocation of FFI.
 * ```
 */
async function ffi(name, ...args) {
    return await ipcRenderer.invoke('ffi', name, ...args);
}

/**
 * @param {string} file The name of the Graphemy file to read from
 * @param {string} text The input text to process
 * @returns {Promise<string>} Output data from the Graphemy CLI
 */
export async function graphemify(file, text) {
    return ffi('graphemify', file, text);
}
