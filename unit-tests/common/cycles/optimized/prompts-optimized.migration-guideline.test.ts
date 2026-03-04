import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('prompts-optimized-10', () => {
  it('mentions one migration per logical change', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('One migration per logical change');
  });
});
