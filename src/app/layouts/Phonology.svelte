<script lang="ts">
    import { Language } from "../stores";
    import { get_pronunciation, writeRomans, complete_word, generate_word } from '../utils/phonetics'
    let trial = ''; let ortho_test = '';
    function setInStone (event: Event) {
        const target = event.target as HTMLInputElement;
        const value = target.value.trim();
        const {[selectedLect]: _, ...rest} = $Language.Pronunciations;
        $Language.Pronunciations = {
            ...rest,
            [selectedLect]: value
        }
    }
    function updatePhonologyInput () {
        (document.getElementById('pronunciations-input') as HTMLInputElement).value = $Language.Pronunciations[selectedLect];
    }
    $: trial_completion = complete_word(trial);
    let selectedLect: string = $Language.Lects[0];
    $: {
        $Language.Lects;
        selectedLect = $Language.UseLects? selectedLect : $Language.Lects[0];
        if (!$Language.Lects.includes(selectedLect)) {
            selectedLect = $Language.Lects[0];
        }
    }
    $: test_pronunciation = get_pronunciation(ortho_test, selectedLect);
    let generated_words = Array(24).fill('');

</script>
<!-- Phonology Tab -->
<div class="tab-pane">
    <div class="row" style="height: 92vh">
        <!-- Phonotactics -->
        <div class="container column scrolled" style="height: 100%">
            <label for="onsets">Onset Consonants</label>
            <textarea id="onsets" class="phonology" bind:value={$Language.Phonotactics.General.Onsets}></textarea>
            <br>
            <label for="medials">Medial Consonants</label>
            <textarea id="medials" class="phonology" bind:value={$Language.Phonotactics.General.Medials}></textarea>
            <br>
            <label for="codas">Coda Consonants</label>
            <textarea id="codas" class="phonology" bind:value={$Language.Phonotactics.General.Codas}></textarea>
            <br>
            <label for="vowels">Vowels</label>
            <textarea id="vowels" class="phonology" bind:value={$Language.Phonotactics.General.Vowels}></textarea>
            <br>
            <label for="illegals">Illegal Combinations</label>
            <textarea id="illegals" class="phonology" bind:value={$Language.Phonotactics.General.Illegals}></textarea>
            <br><br>
            <label for="trial">Trial Words</label>
            <input type="text" id="trial" bind:value={trial}/>
            <p style="font-family: Gentium">{trial_completion}</p>
            <br>
            <button class="hover-highlight hover-shadow" 
                on:click={() => generated_words = Array(24).fill(null).map(_ => generate_word())}
                    >Generate Words</button>
            {#each Array(generated_words.length/3).fill(null) as _, i}
                <div class="row">
                    {#each generated_words.slice(i * 3, i * 3 + 3) as word}
                        <div class="column">
                            <p class="prelined" style="font-family: Gentium">{word}</p>
                        </div>
                    {/each}
                </div>
            {/each}
            <br>
        </div>
        <!-- Romanization -->
        <div class="container column scrolled" style="height: 100%">
            <label>Pronunciations
                {#if $Language.UseLects}    
                    <select bind:value={selectedLect} on:change={updatePhonologyInput}>
                        {#each $Language.Lects as lect}
                            <option value={lect}>{lect}</option>
                        {/each}
                    </select>
                {/if}
                <textarea class="prelined" rows="24" style="text-align: left" id="pronunciations-input"
                    value={$Language.Pronunciations[selectedLect]}
                    on:blur={e => {
                        setInStone(e); // binding directly to the store is very slow when the language is large
                        writeRomans(selectedLect);
                    }}
                />
            </label>
            <br><br>
            <label>Orthography Testing
                <textarea 
                    class="prelined" rows="2" 
                    bind:value={ortho_test}
                />
            </label>
            <textarea
                class="pronunciation" rows="2"
                bind:value={test_pronunciation}
                readonly
            />
        </div>
    </div>
</div>
