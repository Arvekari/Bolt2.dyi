import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('getFineTunedPrompt cwd', () => {
  it('includes provided cwd', () => {
    const prompt = getFineTunedPrompt('/workspace/demo');
    expect(prompt).toContain('/workspace/demo');
  });
});
