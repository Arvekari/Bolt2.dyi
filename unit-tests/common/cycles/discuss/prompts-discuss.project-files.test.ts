import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('prompts-discuss-15', () => {
  it('mentions references to project files', () => {
    expect(discussPrompt()).toContain('Project Files');
  });
});
