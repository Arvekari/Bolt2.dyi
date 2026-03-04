import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('getFineTunedPrompt supabase disconnected', () => {
  it('includes disconnected notice', () => {
    const prompt = getFineTunedPrompt('/tmp', { isConnected: false, hasSelectedProject: false });
    expect(prompt).toContain('not connected to Supabase');
  });
});
