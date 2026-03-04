import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('prompts-system-13', () => {
  it('mentions one artifact per response', () => {
    expect(getSystemPrompt()).toContain('<artifact_info>');
  });
});
