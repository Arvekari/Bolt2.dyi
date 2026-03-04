import { describe, expect, it } from 'vitest';

describe('stores/logs module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/logs');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});