<script lang=ts>
    import { Language } from '../stores';
    import { parseRules, applyRules } from '../utils/sca';
    import type { Word, Phrase, Variant } from '../types';
    import { correctSVGSize, readSVG } from '../utils/files';
    import { graphemify } from '../utils/interop/rust-interop';
    export let word: string;
    export let source: Word | Phrase | Variant;

    async function getSVG(text:string, file_path: string, ortho_name: string): Promise<String> {
        let svg = await readSVG(text, ortho_name);
        if (svg === 'No SVG found.') {
            let graphemy_output = await graphemify(file_path, text, ortho_name);
            // console.debug("Grapemy CLI Output:\n", graphemy_output);
            svg = await readSVG(text, ortho_name);
        }
        return correctSVGSize(svg);
    }
</script>
<!--                                                              type checker gymnastics      -->
{#if ($Language.Orthographies.find(o => o.name === 'Romanization') || {display: false}).display }
        <p style="font-style: italic">{word}</p>
{/if}
{#each $Language.Orthographies as ortho}
    {#if ortho.name !== 'Romanization' && ortho.display && (ortho.root === 'rom' || (ortho.lect in source.pronunciations))}
        {#if ortho.typesetter === 'graphemy'}
            {#await getSVG(word, ortho.font, ortho.name)}
                <p class=info><i>generating...</i></p>
            {:then svg} 
                <div>
                    {@html svg}
                </div>
            {:catch err}
                <p>An error occurred while generating the SVG. The error is printed below. Please contact the developer for assistance.</p>
                <code>{err}</code>
            {/await}
        {:else}
            <p style:font-family={ortho.font}>
                {(()=>{
                    const settings = parseRules(ortho.rules);
                    return applyRules(
                        settings.rules,
                        ortho.root === 'rom'? word : source.pronunciations[ortho.lect].ipa,
                        settings.categories
                    );
                })()}
            </p>
        {/if}
    {/if}
{/each}
