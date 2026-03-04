import { describe, expect, it } from 'vitest';

describe('llm/registry module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/registry');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});