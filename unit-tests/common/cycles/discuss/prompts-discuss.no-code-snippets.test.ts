import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('prompts-discuss-10', () => {
  it('mentions no code snippets in plans', () => {
    expect(discussPrompt()).toContain('NEVER include code snippets in the plan');
  });
});
