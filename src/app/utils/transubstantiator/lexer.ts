import moo from 'moo';

// MARK: Common tokens
const common = {
    comment: / *\/\/\/.*?$/u,
    whitespace: /[ \t]+/u,
    newline: {
        match: /\n|;|;\n/u,
        lineBreaks: true as const,
        pop: 1 as 1 | 0,
    }, // newline will by default step down a state
    anonymous: { match: /\[(?=(?:\S+ *)+\])/u, push: 'anonymous' },
};

const operators = {
    wildcard: '.',
    oneOrMore: '+',
    zeroOrMore: '*',
    zeroOrOne: '?',
    null: '&null',
    space: '&space',
    wordEdge: ['^', '#'],
    start: '&start',
    end: '&end',
};

// MARK: The Lexer
/**
 * The lexer is a state machine that processes the input string and produces a stream of tokens.
 * It is implemented using the moo library.
 */
const lexer = moo.states({
    root: {
        // MARK: — Root state
        whitespace: common.whitespace,
        newline: common.newline,
        comment: common.comment,
        category: { match: /(?=\S+ *::)/u, push: 'category' },
        // The `rule` pattern is a positive lookahead that matches either:
        // - At least one non-space character followed by one or more characters or spaces (\S[\S ]+)
        // - A sequence enclosed in square brackets containing one or more non-whitespace characters separated by spaces (\[(?:\S+ *)+\])
        // Followed by another positive lookahead for either:
        // - Optional spaces followed by '>' or '/'
        // - Two backslashes optionally followed by spaces at the end of the line
        // This pattern identifies the start of a rule and pushes to the 'pattern' state
        rule: {
            match: /(?=(?:\S[\S ]+|\[(?:\S+ *)+\])(?= *(?:[>/]|\\\\ *$)))/u,
            push: 'pattern',
        },
    },
    category: {
        // MARK: — Category state
        whitespace: common.whitespace,
        newline: common.newline,
        comment: common.comment,
        delimiter: '::',
        identifier: /\S+(?= *::)/u,
        member: /[^\s[\];]+/u,
    },
    anonymous: {
        // MARK: — Anonymous state
        whitespace: common.whitespace,
        endAnonymous: { match: /\]/u, pop: 1 },
        member: /[^\s[\];]+/u,
    },
    pattern: {
        // MARK: — Pattern state
        ...common,
        ...operators,
        literal: /(?! *(?:[>/]|\\\\ *$))\S/u,
        transform: { match: /[>/](?= *?\S)/u, next: 'replacement' },
        cascade: { match: /\\\\(?= *\n *?\S)/u, next: 'cascade' },
    },
    replacement: {
        // MARK: — Replacement state
        ...common,
        null: operators.null,
        space: operators.space,
        context: {
            match: /\/(?= *?.*?_.*)/u,
            next: 'context',
        },
        exclude: {
            match: /!!(?= *?.*?_.*)/u,
            next: 'context',
        },
        literal: /[^\s;]/u,
    },
    context: {
        // MARK: — Context state
        ...common,
        ...operators,
        // after already in context state, not testing that these operators are followed by a context pattern;
        // it does not break things if they are not, and can be accounted for in the parser.
        union: { match: ['||', '++'], next: 'context' },
        exclude: { match: '!!', next: 'context' },
        gap: '_',
        literal: /[^\s;]/u,
    },
    cascade: {
        // MARK: — Cascade state
        comment: common.comment,
        indent: { match: / +|\t+/u, push: 'indent' },
        newline: { ...common.newline, pop: 0 }, // override default newline behavior, do not step down a state
        endCascade: { match: /(?! +?|\t+)(?=\S)/u, pop: 1 }, // no indent before some character -> step out of cascade
    },
    indent: {
        // MARK: — Indent state
        newline: common.newline,
        rule: { match: /(?=[^\s;])/u, next: 'replacement' },
    },
});

// MARK: Postprocessor
type Token = [string, string, [number, number]];
function postprocess(lexer: moo.Lexer): Token[] {
    const identifiers: string[] = [];
    return (
        (
            Array.from(lexer)
                // filter out comments
                .filter((token) => token.type !== 'comment')
                // map to array of [type, text, [line, col]]
                .map((token) => {
                    if (token.type === 'identifier')
                        identifiers.push(token.text); // collect identifiers for later
                    return [
                        token.type,
                        token.text,
                        [token.line, token.col],
                    ] as [string, string, [number, number]];
                })
                // combine consecutive literals into one token
                .reduce((accumulator, [type, text, position], index, array) => {
                    if (
                        index > 0 &&
                        type === 'literal' &&
                        array[index - 1][0] === 'literal'
                    )
                        accumulator[accumulator.length - 1][1] += text;
                    else accumulator.push([type, text, position]);

                    return accumulator;
                }, [] as [string, string, [number, number]][])
                // Check if a literal matches an identifier and retype it if so
                .map(([type, text, position], _i, array) =>
                    type === 'literal' &&
                    array.some(
                        (token) =>
                            token[0] === 'identifier' && token[1] === text
                    )
                        ? ['identifier', text, position]
                        : [type, text, position]
            ) satisfies Token[]
        // remove whitespace tokens; they are not filtered out at the beginning so that identifiers can be found
        ).filter((token) => token[0] !== 'whitespace')
    );
}

// MARK: Preprocessor
function preprocess(input: string): string {
    return `${input}\n`.replace(/\r\n|\r/g, '\n');
}

/**
 * Lexer function for processing input strings into tokens.
 *
 * This function preprocesses the input string, then passes it through the
 * lexer, and finally applies post-processing to refine the token stream.
 * The preprocessor ensures that the input string is properly formatted for the
 * lexer, particularly handling newline characters.
 * The post-processing includes:
 * - Filtering out comments and whitespace tokens
 * - Combining consecutive literal tokens
 *
 * @param {string} input - The input string to be lexed
 * @returns {Token[]} An array of tokens, where each token is represented as:
 *   - [0]: Token type (`string`)
 *   - [1]: Token text (`string`)
 *   - [2]: Token position as `[line, column]` (`[number, number]`)
 */
export default function lex(input: string): Token[] {
    // MARK: Lexer wrapper
    lexer.reset(preprocess(input));
    const tokens = postprocess(lexer);
    return tokens.slice(0, -1); // remove added newline
}
