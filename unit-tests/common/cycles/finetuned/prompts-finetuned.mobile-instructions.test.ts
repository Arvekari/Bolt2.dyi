import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle29 finetuned', () => {
  it('contains mobile app instructions section', () => {
    expect(getFineTunedPrompt()).toContain('<mobile_app_instructions>');
  });
});
