import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('cycle32 optimized', () => {
  it('mentions one comprehensive artifact', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('single, comprehensive artifact');
  });
});
