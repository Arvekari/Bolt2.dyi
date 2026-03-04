import { describe, expect, it } from 'vitest';

describe('stores/settings module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/settings');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});