import { describe, expect, it } from 'vitest';

import {
  applyPromptPolicy,
  compactInstructions,
  compactSystemInstructions,
  detectModelClass,
} from '~/lib/.server/llm/prompt-policy';

describe('prompt policy', () => {
  it('detects small model by maxTokenAllowed', () => {
    expect(detectModelClass('gpt-4o-mini', { maxTokenAllowed: 8192 })).toBe('small');
  });

  it('keeps 14B+ local models out of the small prompt profile even with 8k context', () => {
    expect(detectModelClass('qwen2.5-coder:14b', { maxTokenAllowed: 8192 })).toBe('standard');
    expect(detectModelClass('deepseek-r1:14b', { maxTokenAllowed: 8192 })).toBe('standard');
  });

  it('compacts instruction text by trimming duplicate whitespace', () => {
    const compacted = compactInstructions('Line 1\n\n\n   Line 2   with   spaces');
    expect(compacted).toContain('Line 1');
    expect(compacted).toContain('Line 2 with spaces');
  });

  it('keeps both leading and trailing directives when compacting long system prompts', () => {
    const compacted = compactSystemInstructions(`start-directive\n${'x'.repeat(3000)}\nend-directive`, 1200);

    expect(compacted).toContain('start-directive');
    expect(compacted).toContain('end-directive');
    expect(compacted.length).toBeLessThanOrEqual(1200);
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

  it('preserves custom narrative and artifact directives for small models', () => {
    const result = applyPromptPolicy({
      system: `<custom_system_prompt>Use the user narrative to personalize the page.</custom_system_prompt>\n${'x'.repeat(2500)}\n<artifact_info>Respond with exactly one <boltArtifact>.</artifact_info>`,
      messages: [{ role: 'user', content: 'build an introduction page' }],
      modelName: 'deepseek-coder:6.7b',
      modelMeta: { maxTokenAllowed: 8000 },
    });

    expect(result.profile.modelClass).toBe('small');
    expect(result.system).toContain('Use the user narrative to personalize the page.');
    expect(result.system).toContain('<artifact_info>');
    expect(result.system).toContain('<boltArtifact>');
  });
});
