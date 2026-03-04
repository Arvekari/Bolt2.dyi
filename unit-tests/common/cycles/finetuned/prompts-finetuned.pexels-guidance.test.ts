import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle27 finetuned', () => {
  it('mentions stock photos from Pexels', () => {
    expect(getFineTunedPrompt()).toContain('Pexels');
  });
});
