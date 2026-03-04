import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('optimized prompt supabase disconnected', () => {
  it('mentions supabase connection requirement', () => {
    const prompt = optimized({
      cwd: '/tmp',
      allowedHtmlElements: ['p'],
      modificationTagName: 'tag',
      supabase: { isConnected: false, hasSelectedProject: false },
    });

    expect(prompt).toContain('not connected to Supabase');
  });
});
