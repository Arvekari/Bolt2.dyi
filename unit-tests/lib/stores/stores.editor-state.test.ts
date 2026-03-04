import { describe, expect, it } from 'vitest';

describe('stores/editor module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/editor');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});