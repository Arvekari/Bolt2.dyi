import { describe, expect, it } from 'vitest';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';

describe('cycle30 discuss', () => {
  it('contains file quick action guidance', () => {
    expect(discussPrompt()).toContain('type="file"');
  });
});
