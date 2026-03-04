import { describe, expect, it } from 'vitest';

describe('stores/mcp module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/mcp');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});