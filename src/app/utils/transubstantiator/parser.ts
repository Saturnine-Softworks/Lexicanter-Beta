import lex from './lexer';

// MARK: Types
type Token = [string, string];
type Node = {
    type: string;
    children: (Node | Token)[];
};

// MARK: The Parser
export default function parse(input: string): Node {
    const tokens = lex(input).map((token) => [token[0], token[1]] as Token); // type and value, debug
    const operators = [
        'wildcard',
        'oneOrMore',
        'zeroOrMore',
        'zeroOrOne',
        'null',
        'space',
        'wordEdge',
        'start',
        'end',
    ];
    let currentIndex = 0;

    // MARK: — Root node
    function parseRoot(): Node {
        const node: Node = { type: 'root', children: [] };
        while (currentIndex < tokens.length) {
            if (tokens[currentIndex][0] === 'category') {
                node.children.push(parseCategory());
            } else if (tokens[currentIndex][0] === 'rule') {
                node.children.push(parseRule());
            } else if (tokens[currentIndex][0] === 'newline') {
                node.children.push(tokens[currentIndex]);
                currentIndex++;
            } else {
                throw new Error(`Unexpected token: ${tokens[currentIndex][0]}`);
            }
        }
        return node;
    }
    return parseRoot();

    // MARK: — Category nodes
    function parseCategory(): Node {
        const node: Node = { type: 'category', children: [] };
        // node.children.push(tokens[currentIndex]); // category
        currentIndex++;

        if (tokens[currentIndex][0] !== 'identifier') {
            throw new Error(
                `Expected identifier, got: ${tokens[currentIndex][0]}`,
            );
        }
        node.children.push(tokens[currentIndex]); // identifier
        currentIndex++;

        if (tokens[currentIndex][0] !== 'delimiter') {
            throw new Error(
                `Expected delimiter, got: ${tokens[currentIndex][0]}`,
            );
        }
        node.children.push(tokens[currentIndex]); // delimiter
        currentIndex++;

        node.children.push(parseMemberList());

        return node;
    }

    // MARK: — Rule nodes
    function parseRule(): Node {
        const node: Node = { type: 'rule', children: [] };
        // node.children.push(tokens[currentIndex]); // rule
        currentIndex++;

        node.children.push(parsePattern());

        if (tokens[currentIndex][0] === 'transform') {
            node.children.push(parseTransformRule());
        } else if (tokens[currentIndex][0] === 'cascade') {
            node.children.push(parseCascadeRule());
        } else {
            throw new Error(
                `Expected transform or cascade, got: ${tokens[currentIndex].slice(0, 2).join(': ')}`,
            );
        }

        return node;
    }

    // MARK: — Member list nodes
    function parseMemberList(): Node {
        const node: Node = { type: 'memberList', children: [] };
        while (
            currentIndex < tokens.length &&
            tokens[currentIndex][0] === 'member'
        ) {
            node.children.push(tokens[currentIndex]);
            currentIndex++;
        }
        return node;
    }

    // MARK: — Pattern nodes
    function parsePattern(): Node {
        const node: Node = { type: 'pattern', children: [] };
        while (
            currentIndex < tokens.length &&
            (operators.includes(tokens[currentIndex][0]) ||
                tokens[currentIndex][0] === 'literal' ||
                tokens[currentIndex][0] === 'anonymous' ||
                tokens[currentIndex][0] === 'identifier')
        ) {
            if (tokens[currentIndex][0] === 'anonymous') {
                node.children.push(parseAnonymous());
            } else {
                node.children.push(tokens[currentIndex]);
                currentIndex++;
            }
        }
        return node;
    }

    // MARK: — Anonymous nodes
    function parseAnonymous(): Node {
        const node: Node = { type: 'anonymous', children: [] };
        // node.children.push(tokens[currentIndex]); // anonymous
        currentIndex++;

        while (
            currentIndex < tokens.length &&
            tokens[currentIndex][0] !== 'endAnonymous'
        ) {
            if (tokens[currentIndex][0] === 'member') {
                node.children.push(tokens[currentIndex]);
                currentIndex++;
            } else {
                throw new Error(
                    `Unexpected token in anonymous: ${tokens[currentIndex][0]}`,
                );
            }
        }

        // node.children.push(tokens[currentIndex]); // endAnonymous
        currentIndex++;

        return node;
    }

    // MARK: — Transform nodes
    function parseTransformRule(): Node {
        const node: Node = { type: 'transformRule', children: [] };
        // node.children.push(tokens[currentIndex]); // transform
        currentIndex++;

        node.children.push(parseReplacement());

        if (
            currentIndex < tokens.length &&
            (tokens[currentIndex][0] === 'context' ||
                tokens[currentIndex][0] === 'exclude')
        ) {
            node.children.push(parseContext());
        }

        return node;
    }

    // MARK: — Cascade nodes
    function parseCascadeRule(): Node {
        const node: Node = { type: 'cascadeRule', children: [] };
        // node.children.push(tokens[currentIndex]); // cascade
        currentIndex += 2; // skip first mandatory newline

        while (
            currentIndex < tokens.length &&
            tokens[currentIndex][0] !== 'endCascade'
        ) {
            if (tokens[currentIndex][0] === 'indent') {
                node.children.push(parseIndentedRule());
            } else if (tokens[currentIndex][0] === 'newline') {
                // node.children.push(tokens[currentIndex]); // newline
                currentIndex++;
            } else {
                throw new Error(
                    `Unexpected token in cascade: ${tokens[currentIndex][0]}`,
                );
            }
        }

        if (
            currentIndex < tokens.length &&
            tokens[currentIndex][0] === 'endCascade'
        ) {
            // node.children.push(tokens[currentIndex]);
            currentIndex++;
        }

        return node;
    }

    // MARK: — Replacement nodes
    function parseReplacement(): Node {
        const node: Node = { type: 'replacement', children: [] };
        while (
            currentIndex < tokens.length &&
            (tokens[currentIndex][0] === 'literal' ||
                operators.includes(tokens[currentIndex][0]) ||
                tokens[currentIndex][0] === 'anonymous' ||
                tokens[currentIndex][0] === 'identifier')
        ) {
            if (tokens[currentIndex][0] === 'anonymous') {
                node.children.push(parseAnonymous());
            } else {
                node.children.push(tokens[currentIndex]);
                currentIndex++;
            }
        }
        return node;
    }

    // MARK: — Context nodes
    function parseContext(): Node {
        const node: Node = {
            type: tokens[currentIndex][0], // context or exclude
            children: [],
        };
        // node.children.push(tokens[currentIndex]); // context or exclude
        currentIndex++;

        while (currentIndex < tokens.length) {
            if (
                operators.includes(tokens[currentIndex][0]) ||
                tokens[currentIndex][0] === 'literal' ||
                tokens[currentIndex][0] === 'anonymous' ||
                tokens[currentIndex][0] === 'identifier' ||
                tokens[currentIndex][0] === 'gap' ||
                tokens[currentIndex][0] === 'exclude'
            ) {
                if (tokens[currentIndex][0] === 'anonymous') {
                    node.children.push(parseAnonymous());
                } else {
                    node.children.push(tokens[currentIndex]);
                    currentIndex++;
                }
            } else {
                break;
            }
        }
        return node;
    }

    // MARK: — Indent nodes
    function parseIndentedRule(): Node {
        const node: Node = { type: 'indentedRule', children: [] };
        // node.children.push(tokens[currentIndex]); // indent
        currentIndex++;

        if (currentIndex >= tokens.length) {
            // there should always be something after an indent token
            throw new Error('Unexpected EOF after indent.');
        }

        if (tokens[currentIndex][0] === 'rule') {
            // node.children.push(tokens[currentIndex]); // rule
            currentIndex++;
            node.children.push(parsePattern()); // pattern
        }

        if (currentIndex >= tokens.length) {
            // end of file here indicates cascade rule at end of file
            return node;
        }

        if (
            tokens[currentIndex][0] === 'context' ||
            tokens[currentIndex][0] === 'exclude'
        ) {
            node.children.push(parseContext());
        }

        return node;
    }
}
