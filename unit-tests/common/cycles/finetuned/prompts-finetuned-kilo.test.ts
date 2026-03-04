import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('prompts-finetuned-11', () => {
  it('mentions never update existing migration files', () => {
    expect(getFineTunedPrompt()).toContain('<database_instructions>');
  });
});
