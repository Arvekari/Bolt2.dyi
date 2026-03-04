import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('cycle28 optimized', () => {
  it('contains artifact info section', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('<artifact_info>');
  });
});
