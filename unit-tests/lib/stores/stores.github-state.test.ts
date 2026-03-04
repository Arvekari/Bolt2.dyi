import { describe, expect, it } from 'vitest';

describe('stores/github module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/github');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});