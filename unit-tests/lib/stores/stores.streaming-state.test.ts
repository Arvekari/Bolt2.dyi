import { describe, expect, it } from 'vitest';

describe('stores/streaming module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/streaming');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});