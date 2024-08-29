/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcRenderer } = require('electron');
import { get } from 'svelte/store';
import { Language } from '../../stores';
import path from 'path';
const Lang = () => get(Language);

/**
 * @param {string} name The name of the function to be called.
 * @param  {...any} args The arguments that the function takes.
 * @description Wrapper for asynchronous IPC invocation of FFI.
 */
async function ffi(name, ...args) {
    return await ipcRenderer.invoke('ffi', name, ...args);
}

/**
 * @param {string} file The name of the Graphemy file to read from
 * @param {string} text The input text to process
 * @returns {Promise<string>} Output data from the Graphemy CLI
 */
export async function graphemify(file, text, ortho_name) {
    const user_path = `${await ipcRenderer.invoke('getUserDataPath')}/GraphemyCache/${Lang().Name}-${ortho_name}-${text}.svg`;
    const isDev = await ipcRenderer.invoke('isDev');
    const bin_path =
        isDev ?
            './src/app/utils/interop/library/src/graphemy'
        :   path.resolve(process.resourcesPath, 'graphemy');
    return ffi('graphemify', file, text, user_path, bin_path);
}
