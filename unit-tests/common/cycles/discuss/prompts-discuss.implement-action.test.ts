import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('cycle29 discuss', () => {
  it('mentions implement quick action type', () => {
    expect(discussPrompt()).toContain('type="implement"');
  });
});
