import * as diagnostics from './diagnostics';
import { Language } from '../stores';
import { get } from 'svelte/store';
const vex = require('vex-js');

function applyRule(rule: string, input: string, categories): string {
    const caseSensitive = get(Language).CaseSensitive;
    const flags = caseSensitive ? 'g' : 'gi';

    // eslint-disable-next-line prefer-const
    let [pattern, sub, context] = rule.split('/');
    input = ' ' + input + ' ';
    let result = input;

    //SECTION - Preprocess the rule
    const unionRule = /\{(.+)\}/g;
    const boundaryRule = /\^|#/g;
    const negativeRule = /\{!(.+(?:\s+.+)*)\}/g;
    const commaUnionRule = /\s*,\s*/g;
    const spaceRule = /\s+/g;
    const nullRule = /[∅⦰]/g;

    pattern = pattern
        .replaceAll(boundaryRule, '\\s')
        .replaceAll(negativeRule, '(?:(?!$1).)')
        .replaceAll(unionRule, '(?:$1)')
        .replaceAll(commaUnionRule, '|')
        .replaceAll(spaceRule, '')
    ;
    sub = sub
        .replaceAll(spaceRule, '')
    ;
    context = context
        .replaceAll(boundaryRule, '\\s')
        .replaceAll(negativeRule, '(?:(?!$1).)')
        .replaceAll(unionRule, '(?:$1)')
        .replaceAll(commaUnionRule, '|')
        .replaceAll(spaceRule, '')
    ;

    //SECTION - Construct RegExp rule string and map category appearances
    let regString = '(' + context.replace('_', `)${pattern}(`) + ')';
    Object.entries(categories).forEach(([symbol, values]: [string, string[]]) => {
        regString = regString.replaceAll(symbol, `(?:${values.join('|')})`);
    });
    const patternCatMap = pattern.split('').filter(char => char in categories);
    const subCatMap = sub.split('').filter(char => char in categories);
    const contextCatMap = context.split('').filter(char => char in categories);

    function getSlice(match): string {
        //SECTION - Get the index of the pattern in the context, accounting for varying category token lengths
        let expandedContext = context.replaceAll('\\b', '');
        let matchContext = [];
        if (contextCatMap.length > 0) {
            contextCatMap.forEach(symbol => {
                const matchMatches = match.match(new RegExp(`(?:${categories[symbol].join('|')})`, flags));
                matchContext.push([symbol, matchMatches]);
            });
            matchContext = [...new Set(matchContext)].sort((a, b) => b.length - a.length);
        }
        matchContext.forEach(([symbol, matches]) => {
            matches.forEach(match => {
                expandedContext = expandedContext.replace(symbol, match);
            });
        });

        expandedContext = expandedContext.replaceAll('\\s', ' ');
        for (const m of expandedContext.match(/\(\?:(.*)\)\?/g)? expandedContext.match(/\(\?:(.*)\)\?/g) : []) {
            const optional = m.replace(/\(\?:(.*)\)\?/g, '$1');
            /* console.log(
                'm:', `'${m}'`, '|',
                'optional:', `'${optional}'`
            ); */
            const testContext = expandedContext.replace(m, optional);
            let testRegString = '(' + testContext.replace('_', `)${pattern}(`) + ')';
            Object.entries(categories).forEach(([symbol, values]: [string, string[]]) => {
                testRegString = testRegString.replaceAll(symbol, `(?:${values.join('|')})`);
            });
            
            if (input.match(new RegExp(testRegString, flags))) {
                expandedContext = testContext;
            } else {
                expandedContext = expandedContext.replace(m, '');
            }
        }
        for (const m of expandedContext.match(/(.|\s)\?/g)? expandedContext.match(/(.|\s)\?/g) : []) {
            const optional = m.replace(/(.|\s)\?/g, '$1');
            /* console.log(
                'm:', `'${m}'`, '|',
                'optional:', `'${optional}'`
            ); */
            const testContext = expandedContext.replace(m, optional);
            let testRegString = '(' + testContext.replace('_', `)${pattern}(`) + ')';
            Object.entries(categories).forEach(([symbol, values]: [string, string[]]) => {
                testRegString = testRegString.replaceAll(symbol, `(?:${values.join('|')})`);
            });
            
            if (input.match(new RegExp(testRegString, flags))) {
                expandedContext = testContext;
            } else {
                expandedContext = expandedContext.replace(m, '');
            }
        }

        const indexOfPattern = 
            expandedContext
                .replaceAll('?', '')
                .indexOf('_');

        //SECTION - Get the slice of the match that corresponds to the pattern

        const patternLength = 
            !patternCatMap[0]
                ? pattern.length 
                : context === '_'
                    ? match.length
                    : (():number => {
                        let length = 0;
                        Object.entries(categories).filter(
                            ([symbol,]: [string, string[]]) => patternCatMap.includes(symbol)
                        ).forEach(([, values]: [string, string[]]) => {
                            const candidate = values.find(value => match.includes(value));
                            length += candidate? candidate.length : 0;
                        });
                        return length;
                    })();
        /* console.log(
            'iP:', indexOfPattern, '|',
            'pL', patternLength, '|',
            'match:', `'${match}'`, '->',
            'slice:', `'${match.slice(indexOfPattern, indexOfPattern + patternLength)}'`
        ); */
        match = match.slice( 
            indexOfPattern, 
            indexOfPattern + patternLength
        );
        return match;
    }

    //SECTION - Apply the rule
    const matches: string[] = input.match(new RegExp(regString, flags));
    if (matches && sub.includes('_')) {
        matches.forEach(match => {
            const slice = getSlice(match);
            result = result.replace(slice, sub.replaceAll('_', slice));
        });
    } else result = result.replaceAll(new RegExp(regString, flags), `$1${sub}$2`);
    
    if (!!subCatMap[0] && !!patternCatMap[0]) {
        let catMap: string[][] = [];
        if (matches) { 
            catMap = matches.map(match => {
                const slice = getSlice(match);
                //SECTION - Create the map
                const map = [
                    slice,
                    subCatMap[patternCatMap
                        .indexOf(Object.keys(categories)
                            .find(symbol => categories[symbol]
                                .some( (value: string) => 
                                    value === slice && patternCatMap.includes(symbol) 
                                )
                            )
                        )
                    ]
                ];

                return [
                    map[0],
                    map[1],
                    categories[map[1]][ categories[ patternCatMap[subCatMap.indexOf(map[1])] ].indexOf(map[0]) ]
                        ? categories[map[1]][ categories[ patternCatMap[subCatMap.indexOf(map[1])] ].indexOf(map[0]) ]
                        : map[0]
                ];
            });
            matches.forEach((match, i) => {
                result = result
                    .replace(
                        match.replace(catMap[i][0], catMap[i][1]), 
                        match.replace(catMap[i][0], catMap[i][2])
                    );
            });
        }
    }
    /* console.log(
        input, '::', pattern + '/' + sub + '/' + context, '-> ', result
    ); */
    return result
        .replaceAll(nullRule, '')
        .trim();
}

let indialog = false;
export function applyRules(rules: string[], input: string, categories): string {
    let result = input;
    rules.forEach(rule => {
        try {
            result = applyRule(rule, result, categories);
        } catch (err) {
            const error = err as Error;
            diagnostics.logError(`Attempted to apply rule '${rule}' to '${input}'`, error);
            if (!indialog) {
                indialog = true;
                vex.dialog.alert({
                    message: `An error occurred while trying to apply rule '${rule}' to '${input}'. The rule may be invalid. If you think this is a bug, please contact the developer.`,
                    callback: () => {
                        indialog = false;
                    }
                });
            }
        }
    });
    return result;
}

export function parseRules(rules: string): {rules: string[], categories: {[index: string]: string[]}} {
    const result = {
        rules: rules
            .split('\n')
            .map(rule => rule.trim())
            .filter(rule => rule.match(/^.*(?:\/|>).*/)) // p > s || p / s
            .map(rule => rule.match(/\/.*_.*$/) // p > s / _ || p / s / _
                ? rule 
                : rule.match(/\/\s*$/) // p > s / || p / s /
                    ? rule + '_'
                    : rule + '/_'
            )
            .map(rule => rule.split(/(?:\/|>)/).map(part => part.trim()).join('/')),
        categories: Object.fromEntries(
            rules
                .split('\n')
                .map(rule => rule.trim())
                .filter(rule => rule.match(/^.*::.*$/))
                .map(rule => rule.split('::'))
                .map(([symbol, values]) => [ symbol.trim(), values.split(',').map(value => value.trim()) ])
        )
    };
    /* console.log(
        'rules:', result.rules, '|| categories:', result.categories
    ); */
    return result;
}


/* const rules = `
Regular Vowels
V :: 𐌰, 𐌴, 𐌰𐌹, 𐌰𐌿, 𐍉, 𐌹, 𐌴𐌹, 𐌿
A :: a, e, ɛ, ɔ, o, i, i, u
V > A

X :: 𐌲𐌺, 𐌻, 𐌽, 𐌲, 𐌲𐌲, 𐌽𐌳, 𐌽𐍄, 𐌺, 𐍂, 𐍃, 𐌶, 𐍃𐌺, 𐍄, 𐍅, 𐍇, 𐌳, 𐌸
H :: ɲdʑ, ʎ, ɲ, ʑ, dʑ, dʐ, ndʐ, tɕ, ʐ, ʂ, ʐ, ɕ, tʂ, ɥ, ɕ, dʐ, x
X > H / _𐌴𐌹

Consonants
C :: 𐌱, 𐌲, 𐌳, 𐌶, 𐌸, 𐌺, 𐌻, 𐌾, 𐍀, 𐍂, 𐍃, 𐍄, 𐍅,  𐍆, 𐍇, 𐍈, 𐌵, 𐌲𐍅, 𐌷
K :: v, ɣ, ð, z, θ, k, l, j, p, r, s, t, w, f, x, ʍ, kʷ, gʷ, ∅
C > K

Regular Digraphs
J :: 𐌶, 𐌴𐌹, 𐌺, 𐍂, 𐍃, 𐍃𐌺, 𐍄, 𐍅, 𐍇, 𐌲, 𐌲𐌲, 𐌲𐌺, 𐌳, 𐌽𐌳, 𐌽, 𐌽𐍄, 𐌻
Y :: ʐ, x, tɕ, ʐ, ʂ, ɕ, tʂ, ɥ, ɕ, ʑ, dʑ, ɲdʑ, dʐ, dʐ, ɲ, ndʐ, ʎ
J𐌾 > Y∅

𐌱 𐌲 𐌳 Rules
B :: 𐌱, 𐌲, 𐌳
P :: b, g, d
F :: v, ɣ, ð
CB > KP
C𐌳𐌴𐌹 > Kdʐi
BB > P∅
^B > ^P
B > F
^𐌲𐌴𐌹 > dʑi
^𐌲𐌾 > dʑ
𐌲𐌲𐌲 > ɣg
𐌲𐌵 > ŋgʷ
𐌲𐌲𐍅 > gʷ

Special Orthographs
𐌲𐌺 > ŋg
𐌼 > m
𐌼𐌱 > b
𐌼𐍀 > mb
𐌽 > n
𐌽𐌳 > d
𐌽𐍄 > nd
`;
const input = '𐍃𐌴𐌹';
console.log(
    input, '-->',
    applyRules(parseRules(rules).rules, input, parseRules(rules).categories),
);
 */