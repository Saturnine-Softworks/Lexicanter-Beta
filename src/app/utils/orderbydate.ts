// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as diagnostics from './diagnostics';
import type * as Lexc from '../types';

export function orderbydate(lexicon: Lexc.Lexicon): string[] {
    const array_of_entries = [];
    for (const word in lexicon) {
        array_of_entries.push([word, lexicon[word].Timestamp]);
    }
    array_of_entries.sort((a, b) => {
        return b[1] - a[1];
    });

    const array_of_words = array_of_entries.map((entry) => {
        return entry[0];
    });

    return array_of_words;
}
