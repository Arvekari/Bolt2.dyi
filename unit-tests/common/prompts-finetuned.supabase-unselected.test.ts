import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('getFineTunedPrompt supabase unselected', () => {
  it('includes select project reminder', () => {
    const prompt = getFineTunedPrompt('/tmp', { isConnected: true, hasSelectedProject: false });
    expect(prompt).toContain('no project selected');
  });
});
