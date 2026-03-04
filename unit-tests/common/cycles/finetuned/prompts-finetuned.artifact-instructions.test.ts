import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle26 finetuned', () => {
  it('contains artifact instructions section', () => {
    expect(getFineTunedPrompt()).toContain('<artifact_instructions>');
  });
});
