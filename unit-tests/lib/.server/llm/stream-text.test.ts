import { describe, expect, it } from 'vitest';

import { hasToolDefinitions, isToolCallingDisabledForProvider } from '~/lib/.server/llm/stream-text';

describe('lib/.server/llm/stream-text baseline', () => {
  it('exposes helper behavior for tool definitions', () => {
    expect(hasToolDefinitions({})).toBe(false);
    expect(hasToolDefinitions({ toolA: {} })).toBe(true);
  });

  it('disables tool-calling for OpenAI provider', () => {
    expect(isToolCallingDisabledForProvider('OpenAI')).toBe(true);
  });
});
