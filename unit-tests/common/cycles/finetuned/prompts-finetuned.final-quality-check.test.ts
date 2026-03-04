import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle33 finetuned', () => {
  it('contains final quality check heading', () => {
    expect(getFineTunedPrompt()).toContain('Final Quality Check');
  });
});
