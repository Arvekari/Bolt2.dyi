import { describe, expect, it } from 'vitest';

import { hasToolDefinitions, isOpenAIResponsesModel, isToolCallingDisabledForProvider } from '~/lib/.server/llm/stream-text';

describe('lib/.server/llm/stream-text baseline', () => {
  it('exposes helper behavior for tool definitions', () => {
    expect(hasToolDefinitions({})).toBe(false);
    expect(hasToolDefinitions({ toolA: {} })).toBe(true);
  });

  it('keeps tool-calling enabled by default for providers', () => {
    expect(isToolCallingDisabledForProvider('OpenAI')).toBe(false);
    expect(isToolCallingDisabledForProvider('Anthropic')).toBe(false);
  });

  it('detects OpenAI responses models for codex variants only', () => {
    expect(isOpenAIResponsesModel('OpenAI', 'gpt-5.3-codex')).toBe(true);
    expect(isOpenAIResponsesModel('OpenAI', 'gpt-4o')).toBe(false);
    expect(isOpenAIResponsesModel('Anthropic', 'claude-3-5-sonnet')).toBe(false);
  });
});
