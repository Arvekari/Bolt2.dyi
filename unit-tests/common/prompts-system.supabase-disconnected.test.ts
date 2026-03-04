import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('getSystemPrompt supabase disconnected', () => {
  it('includes disconnected guidance', () => {
    const prompt = getSystemPrompt('/tmp', { isConnected: false, hasSelectedProject: false });
    expect(prompt).toContain('not connected to Supabase');
  });
});
