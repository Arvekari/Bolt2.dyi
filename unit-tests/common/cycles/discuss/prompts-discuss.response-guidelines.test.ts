import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('cycle33 discuss', () => {
  it('contains response guidelines section', () => {
    expect(discussPrompt()).toContain('<response_guidelines>');
  });
});
