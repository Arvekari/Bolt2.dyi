import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('discussPrompt constraints', () => {
  it('contains environment and technology constraints', () => {
    const prompt = discussPrompt();
    expect(prompt).toContain('WebContainer');
    expect(prompt).toContain('No Rust compiler available');
  });
});
