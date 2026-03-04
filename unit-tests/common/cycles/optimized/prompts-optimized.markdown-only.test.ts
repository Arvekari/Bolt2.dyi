import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('prompts-optimized-14', () => {
  it('mentions markdown output only', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('Use markdown EXCLUSIVELY');
  });
});
