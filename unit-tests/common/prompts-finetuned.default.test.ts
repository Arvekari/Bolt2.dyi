import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('getFineTunedPrompt default', () => {
  it('returns baseline fine-tuned prompt', () => {
    const prompt = getFineTunedPrompt();
    expect(prompt).toContain('You are Bolt');
    expect(prompt).toContain('The year is 2025');
  });
});
