import { describe, expect, it } from 'vitest';
import { cleanTerminalOutput } from '~/utils/shell';

describe('utils/shell cleanTerminalOutput edges', () => {
  it('strips null chars and repeated whitespace', () => {
    const input = 'foo\u0000\u0000   bar\n\n\n';
    const output = cleanTerminalOutput(input);

    expect(output).toBe('foo bar');
  });

  it('adds line breaks for error keywords and stack traces', () => {
    const input = 'warning: x at foo (/tmp/a.ts:1:1) Error: y npm ERR! z';
    const output = cleanTerminalOutput(input);

    expect(output).toContain('warning: x');
    expect(output).toContain('at foo');
    expect(output).toContain('Error: y');
    expect(output).toContain('npm ERR! z');
  });

  it('normalizes carriage returns to newlines', () => {
    const input = 'a\rb\r\nc';
    const output = cleanTerminalOutput(input);

    expect(output).toContain('a');
    expect(output).toContain('b');
    expect(output).toContain('c');
  });
});
