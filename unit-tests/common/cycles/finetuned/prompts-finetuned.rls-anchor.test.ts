import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('prompts-finetuned-13', () => {
  it('mentions rls policies', () => {
    expect(getFineTunedPrompt()).toContain('<database_instructions>');
  });
});
