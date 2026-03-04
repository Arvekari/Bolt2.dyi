import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('prompts-discuss-11', () => {
  it('mentions single plan per response', () => {
    expect(discussPrompt()).toContain('ONLY ONE SINGLE PLAN per response');
  });
});
