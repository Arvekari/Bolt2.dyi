import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('prompts-discuss-12', () => {
  it('mentions no implementation language', () => {
    expect(discussPrompt()).toContain('NEVER use phrases like "I will implement"');
  });
});
