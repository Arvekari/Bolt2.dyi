import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('getFineTunedPrompt supabase connected', () => {
  it('contains VITE supabase variables when credentials exist', () => {
    const prompt = getFineTunedPrompt('/tmp', {
      isConnected: true,
      hasSelectedProject: true,
      credentials: { supabaseUrl: 'https://abc.supabase.co', anonKey: 'secret' },
    });

    expect(prompt).toContain('VITE_SUPABASE_URL=https://abc.supabase.co');
    expect(prompt).toContain('VITE_SUPABASE_ANON_KEY=secret');
  });
});
