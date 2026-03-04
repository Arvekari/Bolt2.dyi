import { describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/modules/llm/base-provider', () => ({
  BaseProvider: class {},
}));

describe('providers/mistral module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/providers/mistral');
    expect(module.default).toBeDefined();
  });
});