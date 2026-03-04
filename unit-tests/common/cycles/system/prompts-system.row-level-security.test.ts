import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle34 system', () => {
  it('mentions rls requirements', () => {
    expect(getSystemPrompt()).toContain('row level security');
  });
});
