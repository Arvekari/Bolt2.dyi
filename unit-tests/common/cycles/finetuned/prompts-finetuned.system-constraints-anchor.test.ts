import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('prompts-finetuned-15', () => {
  it('contains maintaining context heading', () => {
    expect(getFineTunedPrompt()).toContain('<system_constraints>');
  });
});
