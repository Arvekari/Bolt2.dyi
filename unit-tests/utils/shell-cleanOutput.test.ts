import { describe, expect, it } from 'vitest';
import { cleanTerminalOutput } from '~/utils/shell';

describe('utils/shell cleanTerminalOutput', () => {
  it('removes ansi and osc sequences', () => {
    const input = '\u001b[31mERROR\u001b[0m\n\u001b]654;prompt\u0007';
    const output = cleanTerminalOutput(input);

    expect(output).toContain('ERROR');
    expect(output).not.toContain('\u001b');
    expect(output).not.toContain('654;prompt');
  });

  it('normalizes newlines and spacing', () => {
    const input = 'line1\r\n\r\n\r\nline2   \n\n';
    const output = cleanTerminalOutput(input);

    expect(output).toContain('line1');
    expect(output).toContain('line2');
  });

  it('keeps stacktrace style lines readable', () => {
    const input = 'Error: fail at foo (/tmp/a.ts:1:1) npm ERR! code 1';
    const output = cleanTerminalOutput(input);

    expect(output).toContain('Error: fail');
    expect(output).toContain('npm ERR! code 1');
  });
});
