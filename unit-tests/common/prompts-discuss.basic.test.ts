import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('discussPrompt basic', () => {
  it('returns consultant prompt header', () => {
    const prompt = discussPrompt();
    expect(prompt).toContain('AI Technical Consultant');
    expect(prompt).toContain('response_guidelines');
  });
});
