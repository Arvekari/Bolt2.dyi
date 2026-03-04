import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('getSystemPrompt cwd', () => {
  it('embeds provided cwd', () => {
    const prompt = getSystemPrompt('/tmp/project-x');
    expect(prompt).toContain('/tmp/project-x');
  });
});
