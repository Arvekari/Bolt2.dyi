import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle28 system', () => {
  it('contains database instructions', () => {
    expect(getSystemPrompt()).toContain('<database_instructions>');
  });
});
