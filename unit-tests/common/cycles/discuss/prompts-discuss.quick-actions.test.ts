import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('cycle26 discuss', () => {
  it('contains quick action docs', () => {
    expect(discussPrompt()).toContain('<bolt_quick_actions>');
  });
});
