import { describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/modules/llm/base-provider', () => ({
  BaseProvider: class {},
}));

describe('providers/groq module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/providers/groq');
    expect(module.default).toBeDefined();
  });
});