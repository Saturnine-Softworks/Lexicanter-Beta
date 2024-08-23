<script lang=ts>
    const fs = require('fs');
    const path = require('path');
    import { docsEditor, Language, selectedCategory, fileLoadIncrement, defaultLanguage, dbid, dbkey } from '../stores';
    import type { OutputData } from '@editorjs/editorjs';
    import type * as Lexc from '../types';
    import { userData, showOpenDialog, saveFile, openLegacy, saveAs, importCSV, retrieveFromDatabase } from '../utils/files';
    import { get_pronunciation, writeRomans } from '../utils/phonetics';
    import { initializeDocs } from '../utils/docs';
    import * as diagnostics from '../utils/diagnostics';
    import Evolver from '../components/Evolver.svelte';
    import type { Sense } from '../types';
    import {tooltip} from '@svelte-plugins/tooltips';
    import { onMount } from 'svelte';
    import { verifyHash } from '../utils/verification';
    import { vectorSearchTable } from '@xata.io/client';
    const vex = require('vex-js');

    function selectSaveLocation () {
        showOpenDialog({
            properties: ['openDirectory'],
        }, file_path => {
            if (file_path === undefined) {
                return;
            }
            $Language.SaveLocation = file_path[0];
        });
    }

    $: loading_message = '';
    let csv = {
        headers: true,
        words: 1,
        pronunciations_bool: false,
        pronunciations: 2,
        definitions: 3,
        tags_bool: false,
        tags: 4,
    }
    $: csv;
    let plainTextImport = '';
    $: plainTextImport;

    function tags_array(): string[] {
        return Array.from(new Set<string>(Object.entries($Language.Lexicon).reduce(
            (n: string[], [_, word]: [string, Lexc.Word]) => {
                n.push(...word.Senses.reduce(
                    (m: string[], sense) => {
                        m.push(...sense.tags);
                        return m;
                    }, []
                ));
                return n;
            }, []
        )));
    }

    /**
     * Parses the contents of an opened .lexc file and loads the data into the app.
     * If the file is a legacy version, it is passed to the appropriate function.
     * @param {Object} contents - The contents of the opened file.
     */
    async function read_contents (contents: Lexc.Language) {
        if (typeof contents.Version === 'number' || contents.Version === '1.8.x') {
            try { openLegacy[1.9](contents); }
            catch (err) {
                vex.dialog.alert(` 
                    The file you attempted to open was saved by an old version of Lexicanter (Version ~${contents.Version}), 
                    which is no longer supported. Please contact the developer for assistance; the file is likely recoverable.
                `);
            }
            return;
        }
        let errorMessage: string = 'No error has been set.';
        function setError(message: string): void {
            errorMessage = message;
        }
        try {
            // clear language data
            $Language = structuredClone($defaultLanguage);

            setError('There was a problem loading the settings of the file.')
            $Language.CaseSensitive = contents.CaseSensitive;
            $Language.IgnoreDiacritics = contents.IgnoreDiacritics;
            $Language.HeaderTags = contents.HeaderTags;
            $Language.UseLects = contents.UseLects;
            $Language.ShowEtymology = contents.ShowEtymology;
            $Language.ShowInflection = contents.ShowInflection;
            // check for the existence of properties so that 'undefined' is not assigned
            if (contents.hasOwnProperty('ShowPronunciation')) {
                $Language.ShowPronunciation = contents.ShowPronunciation;
            }
            if (contents.hasOwnProperty('OrderByDate')) {
                $Language.OrderByDate = contents.OrderByDate;
            } else {
                for (let word in contents.Lexicon) {
                    contents.Lexicon[word].Timestamp = Date.now();
                }
            }
            if (contents.hasOwnProperty('SaveLocation')) {
                $Language.SaveLocation = contents.SaveLocation;
            }
            if (contents.hasOwnProperty('FileVersion')) {
                $Language.FileVersion = contents.FileVersion
            }

            setError('There was a problem loading the alphabet from the file.')
            $Language.Alphabet = contents.Alphabet;

            setError('There was a problem loading the file’s lexicon data.')
            $Language.Lexicon = contents.Lexicon;
            $Language.Lects = contents.Lects;
            
            setError('There was a problem loading the file’s phrasebook data.')
            $Language.Phrasebook = contents.Phrasebook;
            $selectedCategory = Object.keys($Language.Phrasebook)[0]; 

            setError('There was a problem loading the file’s documentation data.')
            let docs_data: OutputData = contents.Docs;
            $Language.Docs = docs_data;
            $docsEditor.destroy();
            initializeDocs(docs_data);

            setError('There was a problem loading the pronunciations rules from the file.')
            $Language.Pronunciations = contents.Pronunciations; 
            $Language.Lects.forEach(writeRomans);

            setError('There was a problem loading the orthography data from the file.')
            if (contents.hasOwnProperty('Orthographies')) {
                $Language.Orthographies = contents.Orthographies;
                $Language.ShowOrthography = contents.ShowOrthography;
            }
            
            setError('There was a problem loading the phonotactics rules from the file.')
            $Language.Phonotactics = contents.Phonotactics;

            setError('There was a problem loading the inflection rules from the file.')
            let inflections: Lexc.Language['Inflections'] = contents.Inflections;
            if (!!contents.Inflections.length && !contents.Inflections[0].categories) inflections.map(i => ({...i, categories: ''}));
            $Language.Inflections = contents.Inflections;

            setError('There was a problem loading the etymology data from the file.')
            $Language.Etymologies = contents.Etymologies;

            setError('There was a problem loading the advanced phonotactics.');
            if (contents.hasOwnProperty('AdvancedPhonotactics')) {
                $Language.UseAdvancedPhonotactics = contents.UseAdvancedPhonotactics;
                // Constructs and Illegals fields were added at the same time in 2.1.13 - only need to check for one to know if both exist
                // REVIEW - This could also be achieved by checking if the file version is 2.1.13 or higher, which would require a Semantic Versioning parser.
                //          Could be worth finding a SemVer parser.
                if (!contents.AdvancedPhonotactics.hasOwnProperty('Constructs')) {
                    contents.AdvancedPhonotactics.Constructs = [{enabled:true, structures:''}];
                    contents.AdvancedPhonotactics.Illegals = [];
                }
                $Language.AdvancedPhonotactics = contents.AdvancedPhonotactics;
            }

            setError('There was a problem loading the file’s theme.')
            if (contents.hasOwnProperty('FileTheme')) {
                $Language.FileTheme = contents.FileTheme;
            }

            setError('There was a problem syncing with the database.')
            if (contents.hasOwnProperty('UploadToDatabase')) {
                $Language.UploadToDatabase = contents.UploadToDatabase
                if ($Language.UploadToDatabase) {
                    if ($dbid === '' || $dbkey === '') {
                        vex.dialog.alert('The file you opened has database syncing turned on, but your user ID or account key are blank.');
                        return;
                    }
                    if (verifyHash($dbid, $dbkey)) {
                        const queryResult = await retrieveFromDatabase(contents.Name);
                        if (queryResult !== false) {
                            if (queryResult.FileVersion === undefined) {
                                vex.dialog.confirm({
                                    message: `The file in the database has no FileVersion number. Would you like to overwrite it with your local version?`,
                                    yesText: 'Upload Local Version',
                                    callback: (proceed: boolean) => {
                                        if (proceed) {
                                            saveFile();
                                            vex.dialog.alert('Saved and uploaded local file.')
                                        }
                                    }
                                })
                            } else if ( parseInt($Language.FileVersion, 36) < parseInt(queryResult.FileVersion, 36) ) {
                                vex.dialog.confirm({
                                    message: `Detected a newer version of the file in the database (local: ${$Language.FileVersion} | online: ${queryResult.FileVersion}). Would you like to download the changes?`,
                                    yesText: 'Download Changes',
                                    callback: (proceed: boolean, download = queryResult) => {
                                        if (proceed) {
                                            $Language = download;
                                            initializeDocs(download.Docs);
                                            saveFile();
                                            vex.dialog.alert('Downloaded changes and saved.')
                                        } else {
                                            vex.dialog.alert('Did not download changes. If you change your mind, click the Sync From Database button in the Settings tab. This will overwrite local changes.')
                                        }
                                    }
                                })
                            }
                        } else {
                            vex.dialog.alert('No file of this name was found in your ownership in the database.');
                        }
                    } else {
                        vex.dialog.alert('One or both of your User ID and Key is invalid.');
                    }
                }
            }

        } catch (err) {
            const error = err instanceof Error? err : Error(String(err));
            vex.dialog.alert(errorMessage + ' Please contact the developer for assistance.');
            diagnostics.logError(errorMessage, error);
            diagnostics.debug.logObj(contents, 'File Contents');
        } finally {
            $fileLoadIncrement++;
            diagnostics.logAction(`Opened and read the contents of '${$Language.Name}'.'`);
        }
    }
    
    /**
     * Opens a .lexc file from the user app data folder.
     */
    async function openFile () {
        let contents;
        let dialog = (user_path: string) => {
            showOpenDialog(
                {
                    title: 'Open Lexicon',
                    defaultPath: `${user_path}${path.sep}Lexicons${path.sep}`,
                    properties: ['openFile'],
                },
                file_path => {
                    if (file_path === undefined) {
                        // stop orbit animation
                        pauseLoadAnimation();
                        loading_message = 'No file selected.';
                        window.setTimeout(() => {
                            loading_message = '';
                        }, 5000);
                        return;
                    }
                    fs.readFile(file_path[0], 'utf8', (err: any, data: string) => {
                        if (err) {
                            console.log(err);
                            window.alert(
                                'There was an issue loading your file. Please contact the developer.'
                                );
                            diagnostics.logError('Attempted to open a file.', err);
                            pauseLoadAnimation();
                            loading_message = 'Couldn’t open file.';
                            window.setTimeout(() => { loading_message = ''; }, 5000);
                            return;
                        }
                        contents = JSON.parse(data);
                        read_contents(contents);
                        $Language.Name = path.basename(file_path[0], '.lexc');
                        pauseLoadAnimation();
                        loading_message = 'Done!';
                        window.setTimeout(() => { loading_message = ''; }, 5000);
                    });
                }
            );
        };
        runLoadingAnimation();
        loading_message = 'Loading...';
        await userData(user_path => {
            if (!fs.existsSync(`${user_path}${path.sep}Lexicons${path.sep}`)) {
                fs.mkdir(`${user_path}${path.sep}Lexicons${path.sep}`, () => {
                    diagnostics.logAction(`Created the 'Lexicons' folder in the user data folder at '${user_path}'.`);
                    dialog(user_path);
                });
            } else { dialog(user_path); }
        });
    }
    
    /**
     * Allows the user to import a .lexc file from their computer.
     */
    async function importFile() {
        runLoadingAnimation();
        loading_message = 'Loading...';

        let [file_handle] = await window.showOpenFilePicker();
        await file_handle.requestPermission({ mode: 'read' });
        let file = await file_handle.getFile();
        if (!file.name.includes('.lexc')) {
            window.alert('The selected file was not a .lexc file.');
            pauseLoadAnimation()
            loading_message = 'Incorrect file type.';
            window.setTimeout(() => { loading_message = ''; }, 5000);
            return;
        }
        let string_contents = await file.text();
        let contents = JSON.parse(string_contents);
        read_contents(contents);
        $Language.Name = file.name.split('.')[0];

        pauseLoadAnimation();
        loading_message = 'Done!';
        window.setTimeout(() => { loading_message = ''; }, 5000);
    }

    function importPlainText(plainText: string) {
        /**
         * Format:
         * word
         * optional pronunciation
         * 1. numbered definitions
         * Tags: optional, space separated tags
         * 2. numbered definitions
         * Tags: optional, space separated tags
         * 
         * etc.
         */
        let plainTextEntries = plainTextImport.split('\n\n');
        for (let entry of plainTextEntries) {
            let lines = entry.split('\n');
            let senses = []; let tags = [];
            let word = lines[0].trim(); lines.shift();
            let pronunciation = '';
            if (!lines[0].match(/^[0-9]+\./g)) {
                pronunciation = lines[0].trim(); lines.shift();
                if (pronunciation.match(/^[\/\[].+[\/\]]$/)) {
                    pronunciation = pronunciation.slice(1, pronunciation.length - 1);
                }
            }
            for (let line of lines) {
                if (line.match(/^[0-9]+\./g)) {
                    senses.push(line);
                    if (lines[lines.indexOf(line) + 1].startsWith('Tags: ')) {
                        tags.push(lines[lines.indexOf(line) + 1].slice(6).split(/\s+/g));
                    } else {
                        tags.push([]);
                    }
                }
            }
            let sensesEntry: Sense[] = [];
            for (let sense of senses) {
                sensesEntry.push({
                    'definition': sense.slice(sense.indexOf('.') + 1).trim(),
                    'tags': tags[senses.indexOf(sense)],
                    'lects': $Language.Lects,
                })
            }
            let pronunciations: Lexc.EntryPronunciations = {}
            pronunciations[$Language.Lects[0]] = pronunciation? {
                'ipa': pronunciation,
                'irregular': true,
            } : {
                'ipa': get_pronunciation(word, $Language.Lects[0]),
                'irregular': false,
            }
            let wordEntry = {
                'pronunciations': pronunciations,
                'Senses': sensesEntry,
                'Timestamp': Date.now(),
            }
            
            if (word in $Language.Lexicon) {
                vex.dialog.alert(`The word ${word} is already in the lexicon.`);
            } else {
                $Language.Lexicon[word] = wordEntry;
            }
        }
        plainTextImport = '';
    }

    function pauseLoadAnimation() {
        document.querySelectorAll('.planet').forEach((planet) => {
            // loading anim stop
            (planet as HTMLElement).style.animationPlayState = 'paused';
        });
    }

    function runLoadingAnimation() {
        document.querySelectorAll('.planet').forEach((planet) => {
            // loading anim start
            (planet as HTMLElement).style.animationPlayState = 'running';
        });
    }

    function countOccurrences(input: string) {
        const counts: {[index:string]: number} = input.split('').reduce(
            (counts: {[index: string]: number}, char) => {
                if (char === ' ') return counts;
                counts[char] = counts[char]? counts[char] + 1 : 1;
                return counts;
            },
            { }
        )
        return Object.entries(counts).sort((a, b) => b[1] - a[1])
    }
</script>
<style lang="sass">
    .grid-container
        display: grid
        grid-template-columns: repeat(2, 1fr)
        grid-auto-rows: 1.05rem

        & > *
            margin: 0 .3rem
            &:nth-child(odd)
                text-align: right
            &:nth-child(even)
                text-align: left
</style>
<!-- File Tab -->
<div class=tab-pane>
    <div class=row style=height:95vh>
        <div class='column container' style=overflow-y:auto>
            <p>Document</p>
            <label for=file-name use:tooltip={{position:'right'}} title={`Your file will be saved as: ${$Language.Name}.lexc`}>Name</label>
            <input type=text id=file-name bind:value={$Language.Name}/>
            <br>
            <p>File Statistics</p>
            {#if Object.keys($Language.Lexicon).length === 0}
                <p>The lexicon is empty. No statistics to report.</p>
            {:else}
            <div class=row style=width:80%>
                    <div class=column>
                        <div class=grid-container>
                            <p>Lexicon entries:</p>
                            <p>{Object.keys($Language.Lexicon).length}</p>
                            <p>Average word length:</p>
                            <p>
                                { Math.round(100 * (Object.keys($Language.Lexicon).join('').length / Object.keys($Language.Lexicon).length)) / 100 }
                                characters
                            </p>
                            <p>Longest Word:</p>
                            <p style=font-family:Gentium>
                                { Object.keys($Language.Lexicon).reduce((last, next) => next.length > last.length? next : last) }
                            </p>
                            <p>Shortest Word:</p>
                            <p style=font-family:Gentium>
                                { Object.keys($Language.Lexicon).reduce((last, next) => next.length < last.length? next : last) }
                            </p>
                            <p></p><p></p>
                            <p>Character</p><p>Occurrences</p>
                            {#each countOccurrences(Object.keys($Language.Lexicon).join('')) as character}
                                <p style=font-family:Gentium>{character[0]}</p>
                                <p>{character[1]}</p>
                            {/each}
                        </div>
                    </div>
                    <div class=column>
                        <div class=grid-container>
                            <p>Number of tags:</p>
                            <p>{tags_array().length}</p>
                            <p></p><p></p>
                            <p>Tag Name</p><p>Occurrences</p>
                            {#each tags_array().filter(tag => !!tag).map(tag => ({ 
                                tag: tag,
                                count: Object.values($Language.Lexicon)
                                    .filter(word => word.Senses.some(sense => sense.tags.includes(tag)))
                                    .length
                            })).sort((a, b) => b.count - a.count) as tag}
                                <p style=font-variant:small-caps>{tag.tag}</p>
                                <p>{tag.count}</p>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}
            <br>
            <div class='narrow row'>
                <div class=column>
                    <button on:click={saveFile} class="hover-highlight hover-shadow">Save…</button>
                    <button on:click={openFile} class="hover-highlight hover-shadow">Open…</button>
                    <p class="info">Save your lexicon or open a previously saved one.</p>
                </div>
                <div class=column>
                    <div class=milkyWay>
                        <!-- Loader -->
                        <div class=sun></div>
                        {#each ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as planet}
                            <div class="planet {planet}"></div>
                        {/each}
                    </div>
                    <p>{loading_message}</p>
                </div>
                <div class=column>
                    <button on:click={saveAs.lexc} class='hover-highlight hover-shadow'
                        use:tooltip={{position:'left'}} title='Allows you to save your file to a custom location.'>Export…</button>
                    <button on:click={importFile} class='hover-highlight hover-shadow'
                        use:tooltip={{position:'left'}} title='Makes it easier to import files from a custom location.'>Import…</button>
                    <p class=info>Export and import your own copies of the lexicon file.</p>
                </div>
            </div>
            <div class=narrow>
                <label for=save-locations>Secondary Save Locations</label>
                <button id=save-locations class='hover-highlight hover-shadow' on:click={selectSaveLocation}>Choose Location…</button> 
                <p>Selected location: <u>{$Language.SaveLocation}<u></p>
            </div>
            <br>
            <p use:tooltip={{position:'top'}} title='Here you can define Header Tags. Words in the lexicon with these tags will be sorted above the rest.'>
                Lexicon Header Tags</p>
            <div class=narrow>
                <textarea bind:value={$Language.HeaderTags}></textarea>
                <p class=info>
                    Entries with these tags will be sorted separately at the top of the lexicon.
                </p>
            </div>
            <br>
            <p use:tooltip={{position:'top'}} title="This feature allows you to apply sound change rules across your lexicon, and then save the result as a new language file.">
                Evolve Language</p>
            <Evolver/>
            <br>
            <p>Export Lexicon</p>
            <p>HTML</p>
            <div class="row narrow">
                <div class="column">
                    <button on:click={saveAs.html.lexicon} class="hover-highlight hover-shadow">Lexicon Only</button>
                </div>
                <div class="column">
                    <button on:click={saveAs.html.all} class="hover-highlight hover-shadow">Lexicon & Docs</button>
                </div>
                <div class="column">
                    <button on:click={saveAs.html.docs} class="hover-highlight hover-shadow">Documentation Only</button>
                </div>
            </div>
            <button on:click={saveAs.txt} class="hover-highlight hover-shadow">Text File</button>
            <button on:click={saveAs.csv} class="hover-highlight hover-shadow">CSV</button>
            <button on:click={saveAs.json} class="hover-highlight hover-shadow">JSON</button>
            <br>
            <p>Import Lexicon from CSV</p>
            <div class="narrow">
                <div class="row">
                    <div class="column">
                        <label>Words Column
                            <input type="number" bind:value={csv.words}/>
                        </label>
                    </div>
                    <div class="column">
                        <label>Pronunciations Column
                            <input type="checkbox" bind:value={csv.pronunciations_bool}/>
                            {#if csv.pronunciations_bool}
                                <input type="number" bind:value={csv.pronunciations}/>
                            {/if}
                        </label>
                    </div>
                    <div class="column">
                        <label>Definitions Column
                            <input type="number" bind:value={csv.definitions}/>
                        </label>
                    </div>
                    <div class="column">
                        <label>Tags Column
                            <input type="checkbox" bind:value={csv.tags_bool}/>
                            {#if csv.tags_bool}
                                <input type="number" bind:value={csv.tags}/>
                            {/if}
                        </label>
                    </div>

                </div>
            </div>
            <label for="row-one-is-labels">First Row Is Column Labels</label>
            <input type="checkbox" id="row-one-is-labels" bind:checked={csv.headers}/>
            <button on:click={() => 
                importCSV(
                    csv.headers, 
                    csv.words, 
                    csv.definitions, 
                    csv.pronunciations_bool? csv.pronunciations : false,
                    csv.tags_bool? csv.tags : false
                )
            } class="hover-highlight hover-shadow">Import</button>
            <br>
            <p>Import Lexicon from Plain Text</p>
            <p class="info">Check the Help tab to read about the plain text format Lexicanter can convert into lexicon entries.</p>
            <div class="narrow">
                <textarea bind:value={plainTextImport} class='text-left' rows=6></textarea>
                <button class="hover-highlight hover-shadow" on:click={()=>{
                    importPlainText(plainTextImport);
                    plainTextImport = '';
                }}>Import</button>
            </div>
            <br><br>
        </div>
    </div>
</div>
