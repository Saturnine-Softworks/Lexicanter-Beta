<script lang=ts>
    const { ipcRenderer } = require('electron');
    const vex = require('vex-js');
    vex.registerPlugin(require('vex-dialog'));
    vex.defaultOptions.className = 'vex-theme-os';
	import Lexicon from './layouts/Lexicon.svelte';
    import Etymology from './layouts/Etymology.svelte';
	import Phrasebook from './layouts/Phrasebook.svelte';
	import Phonology from './layouts/Phonology.svelte';
    import Documentation from './layouts/Documentation.svelte';
    // @ts-ignore // For some ungodly reason TypeScript disagrees with this import
	import File from './layouts/File.svelte';
	import Settings from './layouts/Settings.svelte';
    import Changelog from './layouts/Changelog.svelte';
    import { theme, autosave, selectedTab, Language } from './stores';
    import { saveFile } from './utils/files';
    import * as diagnostics from './utils/diagnostics'
    import Inflection from './layouts/Inflection.svelte';
    import Orthography from './layouts/Orthography.svelte';
    import Wiki from './layouts/Wiki.svelte';

    const tabs     = [ Lexicon,   Etymology,   Phrasebook,   Inflection,   Phonology,   Orthography,   Documentation,   File,   Settings,   Changelog, Wiki]
    const tab_btns = ['Lexicon', 'Etymology', 'Phrasebook', 'Inflection', 'Phonology', 'Orthography', 'Documentation', 'File', 'settings', 'history', 'help'];

    /**
     * This block listens for the 'app-close' event, which is sent by the main
     * process, and if the user has autosave enabled, saves the file before
     * closing the app. If the user does not have autosave enabled, it prompts
     * the user to confirm that they want to exit. The 'close' event is sent
     * to the main process when app exit is confirmed.
     */
    ipcRenderer.on('app-close', _ => {
        if ($autosave) {
            console.log('Autosaving before exit.');
            diagnostics.logAction('Autosaving before exit.');
            saveFile().then(_ => {
                window.setTimeout(() => ipcRenderer.send('close'), 1000); // Give time for the notification to show
            });
        } else {
            if ( window.confirm('You may have unsaved changes. Are you sure you want to exit?') )
                ipcRenderer.send('close');
        }
    });
    let version: string;
    ipcRenderer.invoke('getVersion').then((v: string) => version = v);

    let platform: string;
    ipcRenderer.invoke('platform').then((p: string) => platform = p);
</script>

<link rel="stylesheet" href="{$Language.FileTheme === 'default'? $theme : $Language.FileTheme}" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />

<body id="body" spellcheck="false">
    <div class='tab-container'>
        <div class="row">
            <div class="column" style='width: 100%'>
                <p class="window-control">
                    <button class="hover-highlight close material-icons" on:click={() => ipcRenderer.send('buttonclose')}>close</button>
                    <button class="hover-highlight minimize material-icons" on:click={() => ipcRenderer.send('minimize')}>remove</button>
                    <button class="hover-highlight maximize material-icons" on:click={() => ipcRenderer.send('maximize')}>fullscreen</button>
                </p>
                <div class="button-container">

                    <p class="version-info">β{version}-{platform} —</p>

                    {#each tab_btns as tab, i}
                        {#if (tab !== 'Etymology' && tab !== 'Inflection' && tab !== 'Orthography')
                            || (tab === 'Etymology' && $Language.ShowEtymology)
                            || (tab === 'Inflection' && $Language.ShowInflection)
                            || (tab === 'Orthography' && $Language.ShowOrthography)
                        }
                            <button 
                                class:selected={$selectedTab === i} 
                                class='hover-highlight tab-button'
                                style={
                                    ['settings', 'history', 'help'].includes(tab)
                                        ? 'font-family: "Material Icons"; font-size: 1em; vertical-align: bottom; height: 1.8em;'
                                        : ''
                                }
                                on:click={() => $selectedTab = i}
                            > {tab} </button>
                        {/if}
                    {/each}
                </div>
                {#each tabs as tab, i}
                    <div class:collapsed={$selectedTab !== i}>
                        <svelte:component this={tab}/>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</body>
<div></div>
