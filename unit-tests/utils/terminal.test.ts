import { describe, expect, it } from 'vitest';
import { coloredText, escapeCodes } from '~/utils/terminal';

describe('terminal helpers', () => {
  it('exports expected ANSI escape codes', () => {
    expect(escapeCodes.reset).toBe('\x1b[0m');
    expect(escapeCodes.clear).toBe('\x1b[g');
    expect(escapeCodes.red).toBe('\x1b[1;31m');
  });

  it('wraps red text with color and reset', () => {
    expect(coloredText.red('ERR')).toBe('\x1b[1;31mERR\x1b[0m');
  });
});
