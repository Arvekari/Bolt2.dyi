import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle35 finetuned', () => {
  it('contains technology preferences', () => {
    expect(getFineTunedPrompt()).toContain('<technology_preferences>');
  });
});
