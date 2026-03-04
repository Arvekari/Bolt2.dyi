import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('prompts-finetuned-14', () => {
  it('contains setup workflow heading', () => {
    expect(getFineTunedPrompt()).toContain('Action Types');
  });
});
