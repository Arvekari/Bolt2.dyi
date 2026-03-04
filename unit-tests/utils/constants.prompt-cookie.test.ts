import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, PROMPT_COOKIE_KEY } from '~/utils/constants';

describe('constants prompt cookie', () => {
  it('exports cookie key and default model', () => {
    expect(PROMPT_COOKIE_KEY).toBe('cachedPrompt');
    expect(typeof DEFAULT_MODEL).toBe('string');
    expect(DEFAULT_MODEL.length).toBeGreaterThan(0);
  });
});
