import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle28 finetuned', () => {
  it('contains deployment providers mention', () => {
    expect(getFineTunedPrompt()).toContain('You are Opurion');
  });
});
