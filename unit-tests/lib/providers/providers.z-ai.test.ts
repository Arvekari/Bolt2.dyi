import { describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/modules/llm/base-provider', () => ({
  BaseProvider: class {},
}));

describe('providers/z-ai module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/providers/z-ai');
    expect(module.default).toBeDefined();
  });
});