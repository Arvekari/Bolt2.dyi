import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('optimized prompt supabase unselected', () => {
  it('mentions missing project selection', () => {
    const prompt = optimized({
      cwd: '/tmp',
      allowedHtmlElements: ['p'],
      modificationTagName: 'tag',
      supabase: { isConnected: true, hasSelectedProject: false },
    });

    expect(prompt).toContain('no project is selected');
  });
});
