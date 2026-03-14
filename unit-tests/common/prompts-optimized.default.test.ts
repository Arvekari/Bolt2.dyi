import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('optimized prompt default', () => {
  it('returns prompt with baseline sections', () => {
    const prompt = optimized({
      cwd: '/tmp',
      allowedHtmlElements: ['p', 'strong'],
      modificationTagName: 'bolt_file_modifications',
    });

    expect(prompt).toContain('You are Opurion');
    expect(prompt).toContain('database_instructions');
  });
});
