import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle35 system', () => {
  it('mentions available shell commands', () => {
    expect(getSystemPrompt()).toContain('Available shell commands');
  });
});
