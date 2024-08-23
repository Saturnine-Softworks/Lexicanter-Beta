import moo from 'moo';

const common = {
    comment: / *\/\/\/.*?$/u,
    whitespace: /[ \t]+/u,
    newline: { match: /\r\n|\r|\n|;|;\r\n|;\r|;\n/u, lineBreaks: true as true, pop: 1 as 1 | 0}, // newline will by default step down a state
    anonymous: { match: /\[(?=(?:\S+ *)+\])/u, push: 'anonymous' },
}
const operators = {
    wildcard: '.',  
    oneOrMore: '+',
    zeroOrMore: '*',
    zeroOrOne: '?',
    null: '&null',
    space: '&space',
    wordEdge: ['^', '#'],
}

const lexer = moo.states({
    main: {
        whitespace: common.whitespace,
        newline: common.newline,
        comment: common.comment,
        category: { match: /(?=\S+ *::)/u, push: 'category' },
        // The `rule` pattern is a positive lookahead that matches either:
        // - One or more non-whitespace characters (\S+)
        // - A sequence enclosed in square brackets containing one or more non-whitespace characters separated by spaces (\[(?:\S+ *)+\])
        // Followed by another positive lookahead for either:
        // - Optional spaces followed by '>' or '/'
        // - Two backslashes optionally followed by spaces at the end of the line
        // This pattern identifies the start of a rule and pushes to the 'pattern' state
        rule: { match: /(?=(?:\S+|\[(?:\S+ *)+\])(?= *(?:[>/]|\\\\ *$)))/u, push: 'pattern' },
    },
    category: {
        whitespace: common.whitespace,
        newline: common.newline,
        comment: common.comment,
        delimiter: '::',
        identifier: /\S+(?= *::)/u,
        member: /[^\s;]+/u,
    },
    anonymous: {
        endAnonymous: { match: /\]/u, pop: 1 },
        member: /[^\s\[\]]+/u,
        whitespace: common.whitespace,
    },
    pattern: {
        ...common,
        ...operators,
        literal: /\S(?=\S* *(?:[>/]|\\\\ *$))/u,
        transform: { match: /[>/]/u, next: 'replacement' },
        cascade: { match: /\\\\ *$/u, next: 'cascade' },
    },
    replacement: {
        ...common,
        // `contextDelimiter` matches a forward slash '/' optionally followed by spaces,
        // then uses a positive lookahead to ensure it's followed by:
        // - An optional group that's either:
        //   - A sequence in square brackets containing one or more non-space characters separated by spaces
        //   - Or any number of non-space characters (including none)
        // - Followed by an underscore '_'
        // - Then another group similar to the first one (either bracketed sequence or non-space characters)
        // This pattern consumes the delimiter and identifies the transition to the 'context' state
        context: { match: /\/(?= *(?:\[(?:\S+ *)+\]|\S*)?_(?:\[(?:\S+ *)+\]|\S*))/u, next: 'context' },
        // `excludeDelimiter` matches '!!' optionally followed by spaces,
        // then uses the same positive lookahead as `contextDelimiter`.
        // This pattern identifies an exclusion context, which is used to specify
        // patterns that should not be matched in the given context.
        // It also transitions to the 'context' state after matching.
        exclude: { match: /!!(?= *(?:\[(?:\S+ *)+\]|\S*)?_(?:\[(?:\S+ *)+\]|\S*))/u, next: 'context' },
        literal: /[^\s;]/u,
    },
    context: {
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
        comment: common.comment,
        indent: { match: / +|\t+/u, push: 'indent' },
        newline: {...common.newline, pop: 0}, // override default newline behavior, do not step down a state
        endCascade: { match: /(?! +?|\t+)(?=\S)/u, pop: 1 }, // no indent before some character -> step out of cascade
    },
    indent: {
        newline: common.newline,
        rule: { match: /(?=[^\s;])/u, next: 'replacement' },
    }
});


function postprocess(lexer: moo.Lexer): [string, string, [number, number]][] {
    return Array.from(lexer)
        // filter out comments and tokens of type `whitespace`; semantically relevant whitespace is captured by other tokens
        .filter(token => !['comment', 'whitespace'].includes(token.type as string))
        // map to array of [type, text, [line, col]]
        .map(token => [token.type, token.text, [token.line, token.col]] as [string, string, [number, number]])
        // combine consecutive literals into one token
        .reduce((accumulator, [type, text, position], index, array) => {
            (index > 0 && type === 'literal' && array[index - 1][0] === 'literal')
                ? accumulator[accumulator.length - 1][1] += text
                : accumulator.push([type, text, position]);
            return accumulator;
        }, [] as [string, string, [number, number]][])
        // Check if a literal matches an identifier and retype it if so
        .map(([type, text, position], _i, array) =>
            type === 'literal' && array.some(token => token[0] === 'identifier' && token[1] === text)
                ? ['identifier', text, position]
                : [type, text, position]
        );
}
/**
 * Lexer function for processing input strings into tokens.
 * 
 * This function uses a Moo lexer to tokenize the input string and then applies
 * post-processing to refine the token stream. The post-processing includes:
 * - Filtering out comments and whitespace tokens
 * - Combining consecutive literal tokens
 * - Retyping literal tokens to identifiers when appropriate
 * 
 * @param {string} input - The input string to be lexed
 * @returns {Array<[TokenType, string, [number, number]]>} An array of tokens, where each token is represented as:
 *   - [0]: Token type (TokenType)
 *   - [1]: Token text (string)
 *   - [2]: Token position as [line, column] (number[])
 */

export default function lex(input: string): ReturnType<typeof postprocess> {
    lexer.reset(input);
    return postprocess(lexer);
}
