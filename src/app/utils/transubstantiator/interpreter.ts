import parse from './parser';

type Token = [string, string];
type Node = {
    type: string;
    children: (Node | Token)[];
}
type Categories = {
    identifier: string;
    members: string[];
}[]

const operators: Record<string, string> = {
    wildcard: String.raw`\S`,
    oneOrMore: '*',
    zeroOrMore: '+',
    zeroOrOne: '?',
    null: '',
    space: ' ',
    wordEdge: String.raw`\b`,
    start: String.raw`(?<=\b)(?:)(?=\S)`,
    end: String.raw`(?<=\S\b)(?:)`,
};

// MARK: - Node Types
namespace Nodes {
    export enum Types {
        'TransformRule',
        'CascadeRule',
        'Pattern',
        'Transform',
        'Category',
        'Members',
        'Newline',
    }
    export interface TransformRule extends Node {
        type: 'rule';
        children: [Pattern, Transform];
    }
    export interface CascadeRule extends Node {
        type: 'rule';
        children: [Pattern, Cascade];
    }
    export interface Cascade extends Node {
        type: 'cascade';
        children: IndentedRule[];
    }
    export interface IndentedRule extends Node {
        type: 'indentedRule';
        children: [Pattern] | [Pattern, Context];
    }
    export interface Pattern extends Node {
        type: 'pattern';
        children: (Token | AnonymousCategory)[];
    }
    export interface Transform extends Node {
        type: 'transformRule';
        children: [Replacement] | [Replacement, Context];
    }
    export interface Replacement extends Node {
        type: 'replacement';
        children: (Token | AnonymousCategory)[];
    }
    export interface Context extends Node {
        type: 'context' | 'exclude';
        children: Token[];
    }
    export interface Category extends Node {
        type: 'category';
        children: [['identifier', string], ['delimiter', '::'], Members];
    }
    export interface AnonymousCategory extends Node {
        type: 'anonymous';
        children: Literal[];
    }
    export interface Members extends Node {
        type: 'memberList';
        children: Literal[];
    }
    export type Literal = ['literal', string];
}
// MARK: - Node Type Detection
function detectNodeType(node: Node | Token): Nodes.Types {
    const newLineTest =
        Array.isArray(node) ?
            node.length === 2 ?
                node[0] === 'newline' ?
                    ['\n', ';'].includes(node[1]) ?
                        'Newline'
                    :   `Unexpected literal in "newline" token: "${node[1]}"`
                :   `Unexpected top-level token type: "${node[0]}"`
            :   `Invalid token at top level: [ ${node.join(', ')} ]`
        :   false;
    switch (newLineTest) {
        case 'Newline':
            return Nodes.Types.Newline;
        case false:
            break;
        default:
            throw new Error(newLineTest);
    }

    node = node as Node;

    switch (node.type) {
        case 'rule':
            if (
                node.children.length === 2 &&
                'type' in node.children[0] &&
                node.children[0].type === 'pattern' &&
                'type' in node.children[1] &&
                node.children[1].type === 'transformRule'
            ) {
                return Nodes.Types.TransformRule;
            } else if (
                node.children.length === 2 &&
                'type' in node.children[0] &&
                node.children[0].type === 'pattern' &&
                'type' in node.children[1] &&
                node.children[1].type === 'cascadeRule'
            ) {
                return Nodes.Types.CascadeRule;
            }
            break;
        case 'pattern':
            if (
                node.children.every((child): child is Token =>
                    Array.isArray(child),
                )
            ) {
                return Nodes.Types.Pattern;
            }
            break;
        case 'transformRule':
            if (
                node.children.length === 1 &&
                'type' in node.children[0] &&
                node.children[0].type === 'replacement'
            ) {
                return Nodes.Types.Transform;
            }
            break;
        case 'category':
            if (
                node.children.length === 3 &&
                Array.isArray(node.children[0]) &&
                node.children[0][0] === 'identifier' &&
                Array.isArray(node.children[1]) &&
                node.children[1][0] === 'delimiter' &&
                node.children[1][1] === '::' &&
                'type' in node.children[2] &&
                node.children[2].type === 'memberList'
            ) {
                return Nodes.Types.Category;
            }
            break;
        case 'memberList':
            if (
                node.children.every((child): child is Token =>
                    Array.isArray(child),
                )
            ) {
                return Nodes.Types.Members;
            }
            break;
    }

    throw new Error(
        `Unknown node structure:\n${JSON.stringify(node, null, 2)}`,
    );
}

// MARK: - Interpreter Types
namespace Interpreter {
    export interface Root {
        (root: Node): Complete;
    }
    export interface Complete {
        (input: string): Output;
        properties: {
            root: Node;
        };
    }
    export interface Output {
        result: string;
        steps: string[];
    }

    // takes a transform rule node and returns an array of transform rule nodes
    export interface Category {
        (categories: Categories, node: Nodes.TransformRule): Nodes.TransformRule[];
    }

    // takes a cascade rule node and returns an array of Interpreter.Transformer
    export interface Cascade {
        (cascade: Nodes.CascadeRule): Nodes.TransformRule[];
    }

    // returns a function that takes an input string, applies a transformation, and returns the new string
    // the function also has a properties attribute that contains its rule, pattern, and replacement
    export interface TransformRule {
        (rule: Nodes.TransformRule): Transformer;
    }

    export interface Transformer {
        (input: string, index: number): string;
        properties: {
            rule: Nodes.TransformRule;
            replacement: string;
            test: (input: string, lastIndex: number) => RegExpMatchArray | null;
        };
    }
}

/**
 * Interprets a category and expands a transform rule based on category members.
 * @param categories - Array of defined categories
 * @param rule - The transform rule to expand
 * @returns An array of new transform rules with category identifiers replaced by their members
 */
// MARK: - Category Interpreter
// TODO: rewrite.
// likely the best way is to treat all categories as anonymous ones,
// anonymous categories then needing no special handling. 
// have an object that maps category identifiers at specific indices in the pattern
// to their correspondents in the replacement,
// then write rules for each combination of members.
// if there are categories in the context,
// write one of these rules for every combination of those. 
const interpretCategory = ((
    categories: Categories,
    rule: Nodes.TransformRule,
): Nodes.TransformRule[] => {
    // if (!categories.length) return [rule]; // anonymous categories make this return early

    const anonymize = (pattern: (Token | Nodes.AnonymousCategory)[]) =>
        pattern.map((node) => {
            return Array.isArray(node)
                ? // node is a token
                  node[0] === 'identifier'
                    ? // array of string values of each member
                      [
                          'category',
                          ...categories.find(
                              (cat) => cat.identifier === node[1]
                          )!.members,
                      ]
                    : node // original token
                : // node is an anonymous category; same deal as identifier category
                  ['category', ...node.children.map((literal) => literal[1])];
        });
    const pattern = anonymize(rule.children[0].children);
    const replacement = anonymize(rule.children[1].children[0].children);
    const context = anonymize(
        rule.children[1].children[1]?.children ?? [['gap', '_']]
    );

    const decategorizeReplacement = (
        rule: Nodes.TransformRule
    ): Nodes.TransformRule => {
        return {
            type: 'rule',
            children: [
                rule.children[0],
                {
                    type: 'transformRule',
                    children: [
                        {
                            type: 'replacement',
                            children: rule.children[1].children[0].children.map(
                                (child) =>
                                    (child as Token)[0] === 'identifer'
                                        ? ['literal', (child as Token)[1]]
                                        : child
                            ),
                        },
                        rule.children[1].children[1] ?? {
                            type: 'context',
                            children: [['gap', '_']],
                        },
                    ],
                },
            ],
        };
    };

    const patternHasCategories = pattern.some(
        (token) => token[0] === 'category'
    );
    const replacementHasCategories = replacement.some(
        (token) => token[0] === 'category'
    );
    const contextHasCategories = context.some(
        (token) => token[0] === 'category'
    );

    if (
        // if there are no categories in the pattern or context, no expansion is necessary
        // any categories in the replacement are treated as literals
        !(patternHasCategories || contextHasCategories)
    ) {
        return replacementHasCategories
            ? [decategorizeReplacement(rule)]
            : [rule];
    }

    function expand(
        rule: Nodes.TransformRule,
        pattern: string[][],
        mode: 'pattern' | 'context'
    ): Nodes.TransformRule[] {
        // array of arrays of category members
        const categories = pattern
            .filter((token) => token[0] === 'category')
            .map((token) => token.slice(1));

        // array of indices of the where the categories appear in the context
        const categoryIndices = pattern
            .map((token, index) => (token[0] === 'category' ? index : -1))
            .filter((index) => index !== -1);

        const combinations = cartesian(...categories);

        const newPatterns = combinations.map(combination => {
            return pattern.map((token, j) => {
                // i is the index of the combination in the list of combinations
                // j is the index of the current token in the pattern
                return token[0] === 'category'
                    ? ['literal', combination[categoryIndices.indexOf(j)]]
                    : token;
            });
        });

        const substitutes = newPatterns.map((children) => {
            return {
                type: mode,
                children: children,
            };
        });

        return substitutes.map((substitute) => {
            return {
                type: 'rule',
                children: [
                    mode === 'pattern' ? substitute : rule.children[0],
                    {
                        type: 'transformRule',
                        children: [
                            rule.children[1].children[0],
                            mode === 'context'
                                ? substitute
                                : rule.children[1].children[1]
                        ],
                    },
                ],
            } as Nodes.TransformRule;
        });
    }

    let rules = contextHasCategories
        ? expand(rule, context, 'context')
        : [rule]

    if (!patternHasCategories) return rules
    
    if (!replacementHasCategories)
        // no special category conversion from pattern to replacement
        return rules.flatMap(rule => expand(rule, pattern, 'pattern'))

    if (pattern.length !== replacement.length)
        throw new Error(
            'Pattern and replacement must be of equal length for category conversion.' +
            'Use `&null` to align things as necessary.'
        )
    
    const replacementCategories = replacement
        .filter((token) => token[0] === 'category')
        .map((token) => token.slice(1));
    const replacementCartesian = cartesian(...replacementCategories);

    rules = rules.flatMap(rule => {
        return expand(rule, pattern, 'pattern').map((rule, i) => {
            return {
                type: 'rule',
                children: [
                    rule.children[0],
                    {
                        type: "transformRule",
                        children: [
                            {
                                type: "replacement",
                                children: replacement.map((token, j) => {
                                    return token[0] === 'category'
                                        ? ['literal', replacementCartesian[i][j]]
                                        : token
                                }) as Token[]
                            },
                            rule.children[1].children[1]!
                        ]
                    }
                ]
            }
        })
    })

    return rules

}) satisfies Interpreter.Category;

/**
 * Generates the cartesian product of an array of arrays.
 * @param arrays - Arrays to generate the cartesian product from
 * @returns The cartesian product of the arrays
 * @example
 * ```
 * const arrays = [['a', 'b', 'c'], ['d', 'e']];
 * const product = cartesian(...arrays);
 * console.log(product);
 * // Output: [['a', 'd'], ['a', 'e'], ['b', 'd'], ['b', 'e'], ['c', 'd'], ['c', 'e']]
 * ```
 */
function cartesian(...arrays: string[][]): string[][] {
    return arrays.reduce(
        (accumulator: string[][], currentArray: string[]) =>
            accumulator.flatMap((partialResult: string[]) =>
                currentArray.map((element: string) => [
                    ...partialResult,
                    element,
                ])
            ),
        [[]]
    );
}

/**
 * Interprets a cascade rule and returns an array of transform rule nodes.
 */
// MARK: - Cascade Interpreter
const interpretCascade = ((
    cascade: Nodes.CascadeRule,
): Nodes.TransformRule[] => {
    const pattern = cascade.children[0];
    const transformNodes: Nodes.TransformRule[] = [];
    cascade.children[1].children.forEach((rule) => {
        const replacement = rule.children[0];
        const context = rule.children[1] ?? {
            type: 'context',
            children: [['gap', '_']],
        };
        const transformNode = {
            type: 'rule',
            children: [
                pattern,
                {
                    type: 'transformRule',
                    children: [
                        {
                            type: 'replacement',
                            children: replacement.children
                        },
                        context
                    ]
                }
            ]
        } as Nodes.TransformRule;
        transformNodes.push(transformNode);
    });
    return transformNodes;
}) satisfies Interpreter.Cascade;

/**
 * Interprets a transform rule and returns a transformer function.
 * The transformer function takes an input string and applies the transformation.
 */
// MARK: - Transform Interpreter
const interpretTransformRule = ((
    rule: Nodes.TransformRule,
): Interpreter.Transformer => {
    function map(tokens: Token[]) {
        // Maps an array of tokens to a string representation.
        // Replaces operator tokens with corresponding string values.
        return tokens
            .map(([type, value]) => {
                return Object.keys(operators).includes(type)
                    ? operators[type]
                    : value;
            })
            .join('');
    }
    const inNode = rule.children[0];
    const outNode = rule.children[1].children[0];
    const contextNode = rule.children[1].children[1];
    const context = contextNode
        ? contextNode.children
        : ([['gap', '_']] as Token[]);
    const contextInfo = {
        /** Indicates whether there is a context node */
        hasContext: !!contextNode,
        /** Array of tokens representing the context */
        tokens: context,
        /** String representation of the context pattern */
        patternString: '',
        /** Left side of the context pattern */
        leftContext: '',
        /** Right side of the context pattern */
        rightContext: '',
        /** Indicates whether the context is an exclusion, ie, a > b !! _c */
        isExclude: contextNode && contextNode.type === 'exclude',
        /** Indicates whether there is an exclusion within the context, ie, a > b / _c !! c_ */
        hasExclusion: false,
        /** Index of the exclusion token within the context, if present */
        exclusionIndex: -1,
        /** Left side of the exclusion pattern, if an exclusion is present */
        exclusionLeft: '',
        /** Right side of the exclusion pattern, if an exclusion is present */
        exclusionRight: '',
        /** Main regex pattern */
        pattern: new RegExp('', 'yu'),
        /** Exclusion regex pattern if there is exclusion within the context */
        exclusionPattern: new RegExp('', 'yu'),
    };
    if (contextInfo.hasContext) {
        contextInfo.hasExclusion = context.some(
            (child) => child[0] === 'exclude'
        );
        if (contextInfo.hasExclusion) {
            // the token format of a context with an exclusion is to have the exclusion token
            // as part of the context instead of as its own node; hence, find the index of that token
            // and separate accordingly
            // REVIEW: it may be better for the parser to handle this ahead of interpretation
            contextInfo.patternString = map(context).split('!!')[0];
            contextInfo.exclusionIndex = context.findIndex(
                (child) => child[0] === 'exclude'
            );
            [contextInfo.leftContext, contextInfo.rightContext] = map(
                context.slice(0, contextInfo.exclusionIndex)
            ).split('_');
            [contextInfo.exclusionLeft, contextInfo.exclusionRight] = map(
                context.slice(contextInfo.exclusionIndex + 1)
            ).split('_');
        } else {
            contextInfo.patternString = map(context);
            [contextInfo.leftContext, contextInfo.rightContext] =
                contextInfo.patternString.split('_');
        }
    }

    // preprocessing is done on all of the rules before this function generates the transformers, so
    // the children of the inNode and outNode are always tokens.
    // Throw an error if this is not the case.
    if (
        !inNode.children.every((child): child is Token => Array.isArray(child)) ||
        !outNode.children.every((child): child is Token => Array.isArray(child))
    ) {
        throw new Error(
            `Invalid pattern or replacement nodes: all children must be tokens before transform rule interpretation.\n
            Pattern: ${JSON.stringify(inNode)}\n
            Replacement: ${JSON.stringify(outNode)}`
        );
    }
    const inString = map(inNode.children satisfies Token[]);
    const outString = map(outNode.children satisfies Token[]);

    // Construct regex pattern: lookbehind, main pattern, lookahead
    contextInfo.pattern = new RegExp(
        `(?<=${contextInfo.leftContext})(?:${inString})(?=${contextInfo.rightContext})`,
        'yu' // Sticky and Unicode flag
    );
    contextInfo.exclusionPattern = new RegExp(
        `(?<=${contextInfo.exclusionLeft})(?:${inString})(?=${contextInfo.exclusionRight})`,
        'yu' // Sticky and Unicode flag
    );

    // MARK: — Test Function
    // Checks if the pattern matches at the given index and accounts for exclude context types
    const test = (
        contextInfo.isExclude || contextInfo.hasExclusion
            ? (input: string, index: number) => {
                  // Check exclusion pattern, then match with inString or contextInfo.pattern
                  // Return adjusted match or null if no match or exclusion matches
                  const pattern = contextInfo.isExclude
                      ? contextInfo.pattern
                      : contextInfo.exclusionPattern;
                  pattern.lastIndex = index;
                  return !input.match(pattern) // pattern is sticky, if it matches, the exclusion is at the index
                      ? // the exclusion is not at the index
                        contextInfo.isExclude
                          ? (() => {
                                // if the context -is- an exclusion, match with the plain string
                                const match = new RegExp(inString, 'u').exec(
                                    input.slice(index)
                                );
                                return match
                                    ? // index needs to be adjusted, so cannot return match directly
                                      // REVIEW: would sticky flag make this redundant?
                                      { ...match, index: index + match.index }
                                    : null;
                            })()
                          : (() => {
                                // if the context -contains- an exclusion, match with the context pattern
                                contextInfo.pattern.lastIndex = index;
                                return input.match(contextInfo.pattern);
                            })()
                      : // the exclusion is at the index
                        null;
              }
            : // no exclusion
              (input: string, index: number) => {
                  contextInfo.pattern.lastIndex = index;
                  return input.match(contextInfo.pattern);
              }
    ) satisfies (input: string, index: number) => RegExpMatchArray | null;

    // MARK: — Return Function
    // Applies the transformation to the input string at the given index
    return Object.assign(
        (input: string, index: number): string =>
            contextInfo.isExclude || contextInfo.hasExclusion
                ? // is or has an exclusion
                  test(input, index)
                    ? // passes test
                      contextInfo.isExclude
                        ? // is an exclusion-only context; directly replace string at the index
                          input.slice(0, index) +
                          input.slice(index).replace(inString, outString)
                        : // has an exclusion following the context; use context pattern for replacement
                          (() => {
                              contextInfo.pattern.lastIndex = index; // sticky regex
                              return input.replace(
                                  contextInfo.pattern,
                                  outString
                              );
                          })()
                    : // fails test
                      input
                : // does not have exclusion
                  (() => {
                      contextInfo.pattern.lastIndex = index; // sticky regex
                      return input.replace(contextInfo.pattern, outString);
                  })(),
        {
            properties: {
                rule,
                test: test,
                replacement: outString,
            },
        }
    );
}) satisfies Interpreter.TransformRule;

/**
 * Interprets the root node and returns a function that takes an input string and applies the transformation.
 */
// MARK: - Root Interpreter
const interpret = ((root: Node): Interpreter.Complete => {
    const transformPasses: Interpreter.Transformer[][] = [];
    const categories: Categories = [];
    root.children
        .filter(
            (node): node is Nodes.Category =>
                detectNodeType(node) === Nodes.Types.Category
        )
        .forEach((category) => {
            const identifier = category.children[0][1];
            const members = category.children[2].children.map(
                (member) => member[1]
            );
            categories.push({ identifier, members });
        });

    (root.children as Node[]).forEach((node: Node) => {
        switch (detectNodeType(node)) {
            case Nodes.Types.TransformRule: {
                const expandedRules = interpretCategory(categories, node as Nodes.TransformRule);
                const newPass = expandedRules.map(rule => interpretTransformRule(rule));
                transformPasses.push(newPass);
            }
                break;
            case Nodes.Types.CascadeRule: {
                const cascadeRules = interpretCascade(node as Nodes.CascadeRule);
                const expandedRules = cascadeRules.flatMap(rule => 
                    interpretCategory(categories, rule)
                );
                const newPass = expandedRules.map(rule => interpretTransformRule(rule));
                transformPasses.push(newPass);
            }
                break;
            case Nodes.Types.Category || Nodes.Types.Newline:
                // Categories are preprocessed
                break;
        }
    });

    // MARK: — Interpreter Function
    // Applies the transformations to the input string
    return Object.assign(
        (input: string): Interpreter.Output => {
            let result = input;
            const steps: string[] = [input];

            for (const pass of transformPasses) {
                let position = 0;
                while (position < result.length) {
                    let applied = false;

                    for (const transform of pass) {
                        const match = transform.properties.test(
                            result,
                            position,
                        );
                        
                        const atLastIndex = position === result.length - 1;

                        if (match && match.index === position) {
                            const replacement =
                                transform.properties.replacement;
                            result = transform(result, position);
                            position += atLastIndex ? replacement.length + 1 : replacement.length;
                            applied = true;
                            steps.push(result.trim());
                            break;
                        }
                    }

                    if (!applied) {
                        position++;
                    }
                }
            }

            return { result: result.trim(), steps };
        },
        {
            properties: {
                root,
            },
        },
    ) satisfies Interpreter.Complete;
}) satisfies Interpreter.Root;

// MARK: - Program Runner
export default function run(
    program: string,
    input: string,
): Interpreter.Output {
    return interpret(parse(program))(`${input}\t`);
}
