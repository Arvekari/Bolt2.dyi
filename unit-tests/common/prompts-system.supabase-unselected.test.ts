import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('getSystemPrompt supabase unselected project', () => {
  it('includes project selection reminder', () => {
    const prompt = getSystemPrompt('/tmp', { isConnected: true, hasSelectedProject: false });
    expect(prompt).toContain('no project is selected');
  });
});
