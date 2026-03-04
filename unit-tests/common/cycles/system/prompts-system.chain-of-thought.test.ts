import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle33 system', () => {
  it('contains chain of thought instructions section', () => {
    expect(getSystemPrompt()).toContain('<chain_of_thought_instructions>');
  });
});
