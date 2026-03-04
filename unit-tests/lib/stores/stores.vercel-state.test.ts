import { describe, expect, it } from 'vitest';

describe('stores/vercel module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/vercel');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});