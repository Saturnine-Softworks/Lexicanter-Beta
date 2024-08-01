<script lang='ts'>
    import { Language } from "../stores";
    import { parseRules, applyRules } from "../utils/sca";
    let selectedOrtho = '';
    let testInput = '';
    const vex = require('vex-js');
    import { graphemify } from "../utils/interop/rust-interop";
    import { showOpenDialog, readSVG, correctSVGSize } from "../utils/files";

    let orthographyReplacement = {
        pattern: '',
        replacement: ''
    };
    let orthographyChangeEndMessage = '';

    let SVGData: string = '';
    let graphemyOutput: string = '';

    // IIFE here re-reads SVG data on load and every time `graphemyOutput` is updated.
    $: graphemyOutput, (async () => {
        SVGData = correctSVGSize(await readSVG(
            testInput,
            $Language.Orthographies.find(o => o.name === selectedOrtho)?.name,
        ))
    })();

    /**
     * Binding directly to the Language store seems to be very slow, so this function is used to
     * update the store when the user clicks out of an input field.
     * @param event_or_element
     * @param attribute
     * @param index
     */
    function setAttribute(event: Event, attribute: string, index: number) {
        const target = event.target as HTMLInputElement;
        const value = target.value.trim();

        if (attribute === 'name') {
            if ([value, ...$Language.Orthographies.filter(o => o.name === value)].length-1 > 1) {
                vex.dialog.alert('The name must be unique.');
                target.value = `New Orthography ${index}`;
                return;
            }
            if (value === '') {
                vex.dialog.alert('The name cannot be blank.');
                target.value = `New Orthography ${index}`;
                return;
            }
        }

        $Language.Orthographies[index][attribute] = value;
    }
</script>
<div class=tab-pane>
    <div class=row style:height=100%>
        <div class="column container scrolled" style:height=92vh>

            {#each $Language.Orthographies as orthography, i}
                <label>Name
                    <input type=text 
                        on:blur={(e) => {
                            setAttribute(e, 'name', i);
                        }}
                        style:background-color={orthography.name === 'Romanization' ? 'transparent' : ''}
                        value={orthography.name}
                        readonly={orthography.name==='Romanization'}
                    />
                </label>
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label>Typesetter
                    {#if orthography.name === 'Romanization'}
                        <span>: Packaged Font</span>
                    {:else}
                        <select bind:value={$Language.Orthographies[i].typesetter}>
                            <option value=font>Use an installed font</option>
                            <option value=graphemy>Use a Graphemy file</option>
                        </select>
                    {/if}
                </label>
                {#if orthography.typesetter === "font"}
                    <input type=text 
                        on:blur={e => setAttribute(e, 'font', i)}
                        style:background-color={orthography.name === 'Romanization' ? 'transparent' : ''}
                        value={orthography.font}
                        readonly={orthography.name==='Romanization'}
                    />
                {:else if orthography.typesetter === "graphemy"}
                    <button on:click={() => {
                        showOpenDialog({
                            title: 'Select Graphemy File',
                            properties: ['openFile'],
                        },
                        file_path => {
                            $Language.Orthographies[i].font  = file_path[0]
                        });
                    }}>Locate File</button>
                    <input type=text id={`graphemy-file-input${i}`}
                        bind:value={ orthography.font } 
                        readonly
                    />
                {/if}
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label>Root
                    {#if orthography.name === 'Romanization'}
                        <span>: Base input</span>
                    {:else}
                        <select bind:value={orthography.root}>
                            <option value=ipa>Base from pronunciation</option>
                            <option value=rom>Base from romanization</option>
                        </select>
                    {/if}
                </label>
                {#if $Language.UseLects && orthography.root === 'ipa'}
                    <label>Lect
                        <select bind:value={orthography.lect}>
                            {#each $Language.Lects as lect}
                                <option value={lect}>{lect}</option>
                            {/each}
                        </select>
                    </label>
                {/if}
                <br>
                <label>Conversion Rules
                    <textarea
                        rows=3
                        class={orthography.name === 'Romanization'? 'text-center' : 'text-left'}
                        on:blur={(e) => {
                            setAttribute(e, 'rules', i);
                        }}
                        style:background-color={orthography.name === 'Romanization' ? 'transparent' : ''}
                        value={orthography.rules}
                        readonly={orthography.name === 'Romanization'}
                    />
                </label>
                {#if orthography.name !== 'Romanization'}
                    <button
                        class="hover-highlight hover-shadow"
                        on:click={() => {
                            $Language.Orthographies = [
                                ...$Language.Orthographies.slice(0, i),
                                ...$Language.Orthographies.slice(i + 1)
                            ];
                        }}
                    >Delete</button>
                {/if}
            {/each}

            <button
                class="hover-highlight hover-shadow"
                on:click={() => {
                    $Language.Orthographies = [
                        ...$Language.Orthographies,
                        {
                            name: `New Orthography ${$Language.Orthographies.length}`,
                            font: 'Gentium',
                            root: 'ipa',
                            lect: $Language.Lects[0],
                            rules: '',
                            display: true,
                            typesetter: 'font'
                        }
                    ];
                }}
            >New Orthography</button>
        </div>
        <div class="column container scrolled" style:height=92vh>
            <select bind:value={selectedOrtho}>
                {#each $Language.Orthographies as orthography}
                    <option value={orthography.name}>{orthography.name}</option>
                {/each}
            </select>
            <label>Test Input
                <textarea bind:value={testInput} rows=6/>
                {#if $Language.Orthographies.find(o => o.name === selectedOrtho)?.typesetter === 'graphemy'}
                    <button on:click={async () => {
                        graphemyOutput = await graphemify(
                            $Language.Orthographies.find(o => o.name === selectedOrtho)?.font,
                            (() => {
                                const settings = parseRules($Language.Orthographies.find(o => o.name === selectedOrtho)?.rules || '');
                                return applyRules(settings.rules, testInput, settings.categories);
                            })(),
                            $Language.Orthographies.find(o => o.name === selectedOrtho)?.name,
                        );
                    }}>Generate SVG</button>
                    <br>
                    <div>
                        {@html SVGData}
                    </div>
                {:else}
                    <textarea
                        rows=6
                        style:background-color=transparent
                        style:font-family={$Language.Orthographies.find(o => o.name === selectedOrtho)?.font || 'Gentium'}
                        value={(() => {
                            const settings = parseRules($Language.Orthographies.find(o => o.name === selectedOrtho)?.rules || '');
                            return applyRules(settings.rules, testInput, settings.categories);
                        })()}
                        readonly
                    />
                {/if}
            </label>
            <br>
            <br>
            <label>Change Orthography
                <div class="narrow">
                    Pattern: <input type='text' bind:value={orthographyReplacement.pattern}/>
                    Replacement: <input type='text' bind:value={orthographyReplacement.replacement}/>
                    <button on:click={
                        () => {
                            for (let word in $Language.Lexicon) {
                                if (word.includes(orthographyReplacement.pattern)) {
                                    try {
                                        let newWord = '#' + word + '#'
                                        let pattern = orthographyReplacement.pattern.replaceAll('^', '#')
                                        newWord = newWord.replaceAll(pattern, orthographyReplacement.replacement)
                                        $Language.Lexicon[newWord] = $Language.Lexicon[word];
                                        delete $Language.Lexicon[word];
                                        orthographyChangeEndMessage = 'Change applied successfully.';
                                    } catch (e) {
                                        console.log(e);
                                        orthographyChangeEndMessage = 'An error occurred while applying the change. Please contact the developer for assistance and check the console.';
                                    }
                                }
                            }
                        }
                    }>Apply</button>
                    <span style:color=red>{orthographyChangeEndMessage}</span>
                </div>
            </label>

        </div>
    </div>
</div>
