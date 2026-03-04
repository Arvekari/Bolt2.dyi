import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle29 system', () => {
  it('contains design instructions section', () => {
    expect(getSystemPrompt()).toContain('<design_instructions>');
  });
});
