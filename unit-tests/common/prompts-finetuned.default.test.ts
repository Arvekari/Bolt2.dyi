import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('getFineTunedPrompt default', () => {
  it('returns baseline fine-tuned prompt', () => {
    const prompt = getFineTunedPrompt();
    expect(prompt).toContain('You are Opurion');
    expect(prompt).toContain('The year is 2026');
    expect(prompt).toContain('MUST respond with exactly one <boltArtifact>');
  });
});
