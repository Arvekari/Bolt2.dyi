import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('cycle33 optimized', () => {
  it('contains system constraints section', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('<system_constraints>');
  });
});
