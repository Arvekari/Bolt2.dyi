import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('discussPrompt quick actions', () => {
  it('contains quick actions guidance', () => {
    const prompt = discussPrompt();
    expect(prompt).toContain('bolt-quick-actions');
    expect(prompt).toContain('implement');
    expect(prompt).toContain('message');
  });
});
