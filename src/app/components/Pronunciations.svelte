<script lang=ts>
    import type * as Lect from '../types';
    import { Language } from '../stores';
    import {tooltip} from '@svelte-plugins/tooltips';

    export let pronunciations: Lect.EntryPronunciations;
</script>
<style lang=sass>
    .grid
        display: grid
        width: 100%
        grid-template-columns: repeat(2, 1fr)
        grid-auto-rows: 1.05rem
        &-left
            text-align: right
        &-right
            text-align: left
        &-left, &-right
            margin: 0 .3rem
</style>
{#if $Language.ShowPronunciation}
    {#if Object.keys(pronunciations).length > 1 || $Language.UseLects || !pronunciations.General}
        {#each Object.keys(pronunciations) as lect}
            <div class="grid lect">
                <div class="grid-left"><i>{lect}</i></div>
                <div class="grid-right">
                    <span class="pronunciation">
                        {pronunciations[lect].ipa}
                        {#if pronunciations[lect].irregular}
                            <span use:tooltip={{position:'bottom'}}
                                title='irregular pronunciation: rules are not being applied'
                                class='material-icons'
                                style='font-size:0.75em; margin-right:-1em'
                            >lightbulb</span>
                        {/if}
                    </span>
                </div>
            </div>
        {/each}
    {:else}
        <p class="pronunciation">
            {pronunciations.General.ipa}
            {#if pronunciations.General.irregular}
                <span use:tooltip={{position:'bottom'}}
                    title='irregular pronunciation: rules are not being applied'
                    class='material-icons' 
                    style='font-size:0.75em; margin-right:-1em'
                >lightbulb</span>
            {/if}
        </p>
    {/if}
{/if}
