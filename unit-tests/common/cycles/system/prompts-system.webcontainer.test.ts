import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle27 system', () => {
  it('mentions webcontainer constraints', () => {
    expect(getSystemPrompt()).toContain('WebContainer');
  });
});
