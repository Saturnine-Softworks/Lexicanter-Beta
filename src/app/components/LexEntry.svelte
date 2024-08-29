<script lang="ts">
    import { Language } from '../stores';
    import type { Word } from '../types';
    import { createEventDispatcher } from 'svelte';
    import Pronunciations from './Pronunciations.svelte';
    import Inflections from './Inflections.svelte';
    import { markdownToHtml } from '../utils/markdown';
    import EntryLabel from './EntryLabel.svelte';
    const dispatch = createEventDispatcher();
    const edit = () => dispatch('edit')
    export let word: string;
    export let source: Word;
    export let showEtymology: boolean;
    export let showInflections: boolean = false;
    /**
     * This function checks that two arrays contain all of the same values, regardless of index.
     * It's used to check whether or not to display the Lects lists multiple times. 
     */
    function compareArrays(arr1: any[], arr2: any[]): boolean {
        if (arr1.length !== arr2.length) return false;
        return arr1.every((val, i) => arr2.includes(val));
    }

    function getAncestors(): string {
        const ancestors: string[][] = [];
        let currents = [word]
        let maxDepth = 6;
        while (Object.keys($Language.Etymologies)
            .some(
                word =>
                $Language.Etymologies[word].descendants
                    .some(descendant => currents.includes(descendant.name))
            ) && maxDepth
        ) {
            maxDepth--;
            ancestors
            .push(Object.keys($Language.Etymologies)
                .filter(candidateWord => {
                    const isAncestor = $Language.Etymologies[candidateWord].descendants
                        .some(descendant => currents.includes(descendant.name));
                    if (ancestors.flat().includes(word) || (candidateWord === word && isAncestor)) maxDepth = 0
                    return isAncestor;
                })
            );
            currents = ancestors[ancestors.length - 1];
        }
        ancestors.reverse();

        let ancestorString = '';
        let lastGen = '';
        ancestors.forEach(generation => {
            let newGen = generation.join(', ');
            if (newGen !== lastGen) ancestorString += newGen + ' → ';
            lastGen = newGen;
        });
        ancestorString = !!ancestorString? ancestorString + word : '';
        /* debug.log(`
        Ancestor String: ${ancestorString}
        !!ancestorString: ${!!ancestorString}
        $Language.ShowEtymology: ${$Language.ShowEtymology}
        `, false); */
        return ancestorString;
    }

    let entryAncestors: string = '';
    $: { 
        $Language.Etymologies; $Language.Lexicon; word; source;
        entryAncestors = getAncestors();
    }
</script>
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div id='{word}' class="lex-entry prelined" on:contextmenu={edit}>
    <EntryLabel {word} {source} />
    <Pronunciations pronunciations={ source.pronunciations }/>
    {#each source.Senses as Sense, i}
        {#if source.Senses.length > 1} 
            <div class='sense'>{i+1}.</div>
        {/if}
        {#each Sense.tags as tag}
            {#if !!tag}
                <div class='tag-item'>{tag}</div>
            {/if}
        {/each}
        {#if $Language.UseLects && !compareArrays(Sense.lects, Array.from(Object.keys(source.pronunciations)))}        
            <p class="lect">
                {Sense.lects.join(', ')}
            </p>
        {/if}
        <p style='margin-bottom: -1em'>{@html markdownToHtml(Sense.definition)}</p>
        {#if $Language.ShowInflection || showInflections}
            <Inflections {word} tags={Sense.tags} />
        {/if}
        {#if $Language.ShowEtymology && !!entryAncestors && showEtymology}
            <div class='tag-item'>etymology</div>
            <p class="lex-body"><i>{entryAncestors}</i></p>
        {/if}
    {/each}
</div>
