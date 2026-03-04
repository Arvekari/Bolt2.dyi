import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle31 system', () => {
  it('mentions no native binaries', () => {
    expect(getSystemPrompt()).toContain('native binaries');
  });
});
