import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('prompts-optimized-13', () => {
  it('mentions if exists safety', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('IF EXISTS');
  });
});
