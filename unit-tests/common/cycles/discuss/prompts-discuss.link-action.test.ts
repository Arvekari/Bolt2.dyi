import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('cycle31 discuss', () => {
  it('mentions link quick action type', () => {
    expect(discussPrompt()).toContain('type="link"');
  });
});
