import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('prompts-system-14', () => {
  it('mentions shell action type', () => {
    expect(getSystemPrompt()).toContain('Available shell commands');
  });
});
