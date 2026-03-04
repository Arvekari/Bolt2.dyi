import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('optimized prompt supabase connected', () => {
  it('contains populated env hints', () => {
    const prompt = optimized({
      cwd: '/tmp',
      allowedHtmlElements: ['p'],
      modificationTagName: 'tag',
      supabase: {
        isConnected: true,
        hasSelectedProject: true,
        credentials: { supabaseUrl: 'https://demo.supabase.co', anonKey: 'anon' },
      },
    });

    expect(prompt).toContain('VITE_SUPABASE_URL=https://demo.supabase.co');
    expect(prompt).toContain('VITE_SUPABASE_ANON_KEY=anon');
  });
});
