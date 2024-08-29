import { expect, test, describe } from 'vitest';
import run from './interpreter';

describe('basic syntax suit', () => {
    test('simple replacement', () => {
        expect(
            run(
                'a > b',
                'aac'
            ).result
        ).toEqual('bbc');
    });

    test('simple context', () => {
        expect(
            run(
                'a > b / _c',
                'aca'
            ).result
        ).toEqual('bca');
    });

    test('simple exclusion', () => {
        expect(
            run(
                'a > b !! _c',
                'aca'
            ).result
        ).toEqual('acb');
    });

    test('context with exclusion', () => {
        expect(
            run(
                'a > b / _c !! b_',
                'bacac'
            ).result
        ).toEqual('bacbc');
    });

    test('category replacement', () => {
        expect(
            run(
                'C :: a b c ; C > z',
                'abcdef'
            ).result
        ).toEqual('zzzdef');
    });

    test('category conversion', () => {
        expect(
            run(`
                C1 :: a b c
                C2 :: d e f
                C1 > C2`,
                'abc'
            ).result
        ).toEqual('def');
    });

    test('anonymous category', () => {
        expect(
            run('[a b c] > [x y z]',
                'abc'
            ).result
        ).toEqual('xyz');
    })

    test('context with category', () => {
        expect(
            run(
                `
                C1 :: a b c
                x > y / C1_`,
                'ax bx cx dx'
            ).result
        ).toEqual('ay by cy dx');
    });

    test('cascade rule', () => {
        expect(
            run(
                String.raw`
                a \\
                    b / ._.
                    c / _#`,
                'aaa'
            ).result
        ).toEqual('abc');
    });
});

describe('special operators suite', () => {
    test('spaces: pattern', () => {
        expect(
            run(
                'a &space b > c',
                'a b'
            ).result
        ).toEqual('c');
    });
    test('spaces: replacement', () => {
        expect(
            run(
                'a > a &space b',
                'a'
            ).result
        ).toEqual('a b');
    });
    test('spaces: context', () => {
        const program = 'a > b / &space_'
        expect(run(program, 'a a').result)
            .toEqual('a b')
        expect(run(program, 'aa').result)
            .toEqual('aa') // expect no change
    })

    test('start insert', () => {
        expect(
            run(
                '&start > a',
                'bc'
            ).result
        ).toEqual('abc');
    });

    test('multiple start insert', () => {
        expect(
            run(
                '&start > b; &start > a',
                'c'
            ).result
        ).toEqual('abc');
    });

    test('end insert', () => {
        expect(
            run(
                '&end > c',
                'ab'
            ).result
        ).toEqual('abc');
    });

    test('multiple end inserts', () => {
        expect(
            run(
                '&end > b; &end > c',
                'a'
            ).result
        ).toEqual('abc');
    });

    test('multiple end inserts', () => {
        expect(
            run(
                '&end > b; &end > c',
                'a'
            ).result
        ).toEqual('abc');
    });

    test('diacritics', () => {
        expect(
            run(
                `
                C :: a b c
                &null >́ / C_`,
                'abc'
            ).result
        ).toEqual('áb́ć');
    });

});
