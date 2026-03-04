import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('prompts-system-15', () => {
  it('mentions file action rules', () => {
    expect(getSystemPrompt()).toContain('<artifact_info>');
  });
});
