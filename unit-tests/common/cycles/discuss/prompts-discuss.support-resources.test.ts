import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('cycle27 discuss', () => {
  it('contains support resources section', () => {
    expect(discussPrompt()).toContain('<support_resources>');
  });
});
