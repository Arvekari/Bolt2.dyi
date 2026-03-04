import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('prompts-system-12', () => {
  it('mentions query operation', () => {
    expect(getSystemPrompt()).toContain('operation="query"');
  });
});
