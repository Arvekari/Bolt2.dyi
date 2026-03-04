import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('cycle28 discuss', () => {
  it('contains search grounding section', () => {
    expect(discussPrompt()).toContain('<search_grounding>');
  });
});
