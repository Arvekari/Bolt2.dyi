import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle31 finetuned', () => {
  it('mentions no git availability', () => {
    expect(getFineTunedPrompt()).toContain('Git not available');
  });
});
