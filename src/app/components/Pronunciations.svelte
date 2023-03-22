<script lang="ts">
    import type * as Lect from '../types';
    import { Language } from '../stores';

    export let pronunciations: Lect.EntryPronunciations;
</script>
{#if $Language.UseLects}
    {#each Object.keys(pronunciations) as lect}
        <div style='padding-bottom: 0.33em'>
            <p class="lect" style='padding-bottom: 0.1em'>
                <u>{lect}</u>
            </p>
            <p class="pronunciation">
                {pronunciations[lect].ipa}
            </p>
        </div>
    {/each}
{:else}
    <p class="pronunciation">
        {pronunciations.General.ipa}
    </p>
{/if}
