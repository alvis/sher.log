import { Chalk } from 'chalk';
import { describe, expect, it } from 'vitest';

import { highlight } from '#highlight';

import type { HighlightTheme } from '#highlight';

describe('fn:highlight', () => {
  // create a no-color theme for testing text preservation
  const noColorChalk = new Chalk({ level: 0 });
  const noColorTheme: HighlightTheme = {
    string: noColorChalk.green,
    punctuator: noColorChalk.gray,
    keyword: noColorChalk.cyan,
    number: noColorChalk.magenta,
    regex: noColorChalk.yellow,
    comment: noColorChalk.blue,
    invalid: noColorChalk.red,
  };

  // create a colored theme for testing ANSI code presence
  const colorChalk = new Chalk({ level: 3 });
  const colorTheme: HighlightTheme = {
    string: colorChalk.green,
    punctuator: colorChalk.gray,
    keyword: colorChalk.cyan,
    number: colorChalk.magenta,
    regex: colorChalk.yellow,
    comment: colorChalk.blue,
    invalid: colorChalk.red,
  };

  const preservationCases: Array<[label: string, source: string]> = [
    ['string literals', `const message = "Hello, World!";`],
    // eslint-disable-next-line no-template-curly-in-string
    ['template literals', 'const greeting = `Hello ${name}!`;'],
    ['numbers', 'const pi = 3.14159; const hex = 0xFF;'],
    ['keywords', 'if (true) { return false; } else { throw new Error(); }'],
    ['TypeScript keywords', 'interface Foo { readonly bar: string; }'],
    ['regular expressions', 'const pattern = /test\\d+/gi;'],
    ['single-line comments', '// This is a comment\nconst x = 1;'],
    [
      'multi-line comments',
      '/* This is\n   a multi-line\n   comment */\nconst y = 2;',
    ],
    ['punctuators', 'obj.prop = arr[0] + (a * b);'],
    ['regular identifiers', 'const myVariable = someFunction();'],
    ['whitespace', 'const x = 1;\n\tconst y = 2;'],
    ['empty source', ''],
    ['source with only whitespace', '   \n\t  '],
  ];

  it.each(preservationCases)('should preserve %s', (_label, source) => {
    const result = highlight(source, noColorTheme);

    expect(result).toBe(source);
  });

  it('should apply colors when using colored theme', () => {
    const source = 'const greeting = "Hello"; // say hello';

    // expected output with ANSI color codes
    // cyan for 'const', gray for '=' and ';', green for string, blue for comment
    const expected =
      '\x1b[36mconst\x1b[39m greeting \x1b[90m=\x1b[39m ' +
      '\x1b[32m"Hello"\x1b[39m\x1b[90m;\x1b[39m \x1b[34m// say hello\x1b[39m';

    const result = highlight(source, colorTheme);

    expect(result).toBe(expected);
  });

  it('should handle invalid tokens', () => {
    // a lone backslash is an invalid token in JavaScript
    const source = 'const x = \\';

    // with no-color theme, the invalid token is preserved as-is
    const noColorResult = highlight(source, noColorTheme);
    expect(noColorResult).toBe(source);

    // expected output with ANSI color codes
    // cyan for 'const', gray for '=', red for invalid backslash
    const expectedColor =
      '\x1b[36mconst\x1b[39m x \x1b[90m=\x1b[39m \x1b[31m\\\x1b[39m';

    const colorResult = highlight(source, colorTheme);

    expect(colorResult).toBe(expectedColor);
  });
});
