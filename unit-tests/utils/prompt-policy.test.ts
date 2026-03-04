import { describe, expect, it } from 'vitest';

import { applyPromptPolicy, compactInstructions, detectModelClass } from '~/lib/.server/llm/prompt-policy';

describe('prompt policy', () => {
  it('detects small model by maxTokenAllowed', () => {
    expect(detectModelClass('gpt-4o-mini', { maxTokenAllowed: 8192 })).toBe('small');
  });

  it('compacts instruction text by trimming duplicate whitespace', () => {
    const compacted = compactInstructions('Line 1\n\n\n   Line 2   with   spaces');
    expect(compacted).toContain('Line 1');
    expect(compacted).toContain('Line 2 with spaces');
  });

  it('prunes oversized context and keeps newest message', () => {
    const result = applyPromptPolicy({
      system: 'You are a helpful coding assistant.',
      messages: [
        { role: 'user', content: 'a'.repeat(3000) },
        { role: 'assistant', content: 'b'.repeat(3000) },
        { role: 'user', content: 'important latest message' },
      ],
      modelName: 'tiny-small-model',
      modelMeta: { maxTokenAllowed: 4096 },
    });

    expect(result.profile.modelClass).toBe('small');
    expect(result.messages.at(-1)?.content).toContain('important latest message');
    expect(result.diagnostics.wasPruned).toBe(true);
  });
});
