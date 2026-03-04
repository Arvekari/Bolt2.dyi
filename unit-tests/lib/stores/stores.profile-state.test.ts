import { describe, expect, it } from 'vitest';

describe('stores/profile module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/profile');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});