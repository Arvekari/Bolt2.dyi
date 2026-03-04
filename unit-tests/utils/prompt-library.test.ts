import { describe, it, expect } from 'vitest';
import { PromptLibrary } from '~/lib/common/prompt-library';

describe('PromptLibrary', () => {
  it('returns a non-empty library list', () => {
    const list = PromptLibrary.getList();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((item) => item.id === 'default')).toBe(true);
  });

  it('returns prompt text for known prompt id', () => {
    const prompt = PromptLibrary.getPropmtFromLibrary('default', {
      cwd: '/tmp/demo',
      allowedHtmlElements: [],
      modificationTagName: 'boltAction',
    });

    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('throws for unknown prompt id', () => {
    expect(() =>
      PromptLibrary.getPropmtFromLibrary('missing', {
        cwd: '/tmp/demo',
        allowedHtmlElements: [],
        modificationTagName: 'boltAction',
      }),
    ).toThrow();
  });
});
