import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('cycle26 optimized', () => {
  it('contains code formatting info', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('<code_formatting_info>');
  });
});
