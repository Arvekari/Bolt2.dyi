import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('cycle30 system', () => {
  it('contains message formatting info', () => {
    expect(getSystemPrompt()).toContain('<message_formatting_info>');
  });
});
