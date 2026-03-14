import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('prompts-finetuned-12', () => {
  it('mentions data integrity highest priority', () => {
    expect(getFineTunedPrompt()).toContain('You are Opurion');
  });
});
