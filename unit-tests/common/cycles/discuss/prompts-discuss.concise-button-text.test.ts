import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('prompts-discuss-14', () => {
  it('mentions concise button text rule', () => {
    expect(discussPrompt()).toContain('Make button text concise');
  });
});
