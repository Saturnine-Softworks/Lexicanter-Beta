<script lang='ts'>
    const { ipcRenderer } = require('electron');
    import { referenceLanguage } from '../stores';
    import ReferenceLex from '../components/ReferenceLex.svelte';
    import ReferenceTrees from '../components/ReferenceTrees.svelte';
    import ReferenceDocs from '../components/ReferenceDocs.svelte';

    const tab_btns = ['Lexicon', 'Etymology', 'Docs'];
    const tabs = [ReferenceLex, ReferenceTrees, ReferenceDocs];
    let selectedTab = 0;

    let version: string;
    ipcRenderer.invoke('getVersion').then((v: string) => version = v);

    let platform: string;
    ipcRenderer.invoke('platform').then((p: string) => platform = p);
</script>
{#if typeof $referenceLanguage === 'object'}
    <div class="button-container">
        <p class="version-info">β{version}-{platform} —</p>
        {#each tab_btns as tab, i}
            {#if (tab !== 'Etymology' && tab !== 'Inflection')
                || (tab === 'Etymology' && $referenceLanguage.ShowEtymology)
                || (tab === 'Inflection' && $referenceLanguage.ShowInflection)
            }
                <button class:selected={selectedTab === i} class='hover-highlight tab-button'
                    on:click={() => selectedTab = i}
                > {tab}
                </button>
            {/if}
        {/each}
    </div>

    {#each tabs as tab, i}
        <div class:collapsed={selectedTab !== i}>
            <div class="container" style="height:92vh">
                <svelte:component this={tab}/>
            </div>
        </div>
    {/each}
{/if}
