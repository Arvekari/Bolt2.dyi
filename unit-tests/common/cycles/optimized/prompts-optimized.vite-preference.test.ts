import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('prompts-optimized-11', () => {
  it('mentions use vite for web servers', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('Use Vite for web servers');
  });
});
