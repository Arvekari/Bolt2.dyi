import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('prompts-optimized-12', () => {
  it('mentions no transaction control', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('FORBIDDEN: Any transaction control statements');
  });
});
