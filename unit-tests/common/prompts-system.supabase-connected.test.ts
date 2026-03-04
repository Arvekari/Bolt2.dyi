import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('getSystemPrompt supabase connected', () => {
  it('includes env variable hints when credentials are available', () => {
    const prompt = getSystemPrompt('/tmp', {
      isConnected: true,
      hasSelectedProject: true,
      credentials: { supabaseUrl: 'https://demo.supabase.co', anonKey: 'anon-key' },
    });
    expect(prompt).toContain('VITE_SUPABASE_URL=https://demo.supabase.co');
    expect(prompt).toContain('VITE_SUPABASE_ANON_KEY=anon-key');
  });
});
