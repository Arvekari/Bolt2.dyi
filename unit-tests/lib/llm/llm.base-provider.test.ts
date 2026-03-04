import { describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/modules/llm/manager', () => ({
  LLMManager: {
    getInstance: () => ({ env: {} }),
  },
}));

describe('llm/base-provider module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/base-provider');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});