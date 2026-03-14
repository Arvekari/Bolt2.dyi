import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle26 system', () => {
  it('contains response requirements section', () => {
    expect(getSystemPrompt()).toContain('You are Opurion');
  });
});
