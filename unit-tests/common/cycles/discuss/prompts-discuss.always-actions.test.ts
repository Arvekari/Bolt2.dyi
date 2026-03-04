import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('prompts-discuss-13', () => {
  it('mentions always include quick actions', () => {
    expect(discussPrompt()).toContain('ALWAYS include at least one action');
  });
});
