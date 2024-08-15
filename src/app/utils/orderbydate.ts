import type * as Lexc from '../types';

export function lorderbydate(lexicon: Lexc.Lexicon): string[] {
    return (Object.entries(lexicon).map(([word, entry]) => [word, entry.Timestamp]) satisfies [string, number][])
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
}
