import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('prompts-system-11', () => {
  it('mentions migration operation', () => {
    expect(getSystemPrompt()).toContain('operation="migration"');
  });
});
