import { describe, expect, it } from 'vitest';

describe('stores/theme module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/theme');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});