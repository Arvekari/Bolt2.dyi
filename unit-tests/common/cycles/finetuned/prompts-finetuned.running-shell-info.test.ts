import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('cycle30 finetuned', () => {
  it('contains running shell command guidance', () => {
    expect(getFineTunedPrompt()).toContain('<running_shell_commands_info>');
  });
});
