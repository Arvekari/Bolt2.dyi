import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle32 finetuned', () => {
  it('contains strict rules heading', () => {
    expect(getFineTunedPrompt()).toContain('CRITICAL RULES - MANDATORY');
  });
});
