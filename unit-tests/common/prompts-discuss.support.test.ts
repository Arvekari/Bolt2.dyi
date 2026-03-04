import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('discussPrompt support resources', () => {
  it('mentions official support links section', () => {
    const prompt = discussPrompt();
    expect(prompt).toContain('support_resources');
    expect(prompt).toContain('support.bolt.new');
  });
});
