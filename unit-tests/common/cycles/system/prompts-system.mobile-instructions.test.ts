import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle32 system', () => {
  it('contains mobile app instructions section', () => {
    expect(getSystemPrompt()).toContain('<mobile_app_instructions>');
  });
});
