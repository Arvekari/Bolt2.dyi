import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('cycle32 discuss', () => {
  it('mentions message quick action type', () => {
    expect(discussPrompt()).toContain('type="message"');
  });
});
