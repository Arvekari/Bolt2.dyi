import { describe, expect, it } from 'vitest';

import { hasToolDefinitions, isToolCallingDisabledForProvider } from '~/lib/.server/llm/stream-text';

describe('stream-text tool option guards', () => {
  it('returns false for undefined and empty tools object', () => {
    expect(hasToolDefinitions(undefined)).toBe(false);
    expect(hasToolDefinitions({})).toBe(false);
  });

  it('returns true when tools object has at least one tool', () => {
    expect(
      hasToolDefinitions({
        searchWeb: {
          description: 'Search the web',
        },
      }),
    ).toBe(true);
  });

  it('returns false for invalid non-object values', () => {
    expect(hasToolDefinitions(null)).toBe(false);
    expect(hasToolDefinitions([])).toBe(false);
    expect(hasToolDefinitions('tools')).toBe(false);
  });

  it('disables tool calling for OpenAI provider', () => {
    expect(isToolCallingDisabledForProvider('OpenAI')).toBe(true);
    expect(isToolCallingDisabledForProvider('Anthropic')).toBe(false);
  });
});
