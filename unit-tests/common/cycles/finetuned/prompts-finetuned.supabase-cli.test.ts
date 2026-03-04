import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle34 finetuned', () => {
  it('mentions no supabase cli', () => {
    expect(getFineTunedPrompt()).toContain('Cannot use Supabase CLI');
  });
});
