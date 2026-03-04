import { describe, it, expect } from 'vitest';
import { stripIndents } from '~/utils/stripIndent';

describe('stripIndents', () => {
  it('strips indentation in plain string mode', () => {
    const value = stripIndents('  hello\n    world\n');
    expect(value).toBe('hello\nworld');
  });

  it('strips indentation in template literal mode', () => {
    const name = 'bolt';
    const value = stripIndents`
      hello ${name}
      world
    `;

    expect(value).toBe('hello bolt\nworld');
  });

  it('removes trailing final newline', () => {
    const value = stripIndents('a\n');
    expect(value).toBe('a');
  });
});
