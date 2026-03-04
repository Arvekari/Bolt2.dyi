import { describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/modules/llm/base-provider', () => ({
  BaseProvider: class {},
}));

describe('providers/hyperbolic module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/providers/hyperbolic');
    expect(module.default).toBeDefined();
  });
});