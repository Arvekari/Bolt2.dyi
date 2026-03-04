import { describe, expect, it } from 'vitest';
import { cleanStackTrace } from '~/utils/stacktrace';

describe('utils/stacktrace', () => {
  it('replaces webcontainer URLs with relative paths', () => {
    const input = [
      'Error: boom',
      '    at fn (https://abc123.webcontainer-api.io/src/index.ts:10:2)',
      '    at other (https://xyz.webcontainer-api.io/app/main.ts:20:1)',
    ].join('\n');

    const output = cleanStackTrace(input);

    expect(output).toContain('at fn (src/index.ts:10:2)');
    expect(output).toContain('at other (app/main.ts:20:1)');
  });

  it('keeps non-webcontainer URLs unchanged', () => {
    const input = 'at fn (https://example.com/a.ts:1:1)';
    const output = cleanStackTrace(input);
    expect(output).toBe(input);
  });
});
