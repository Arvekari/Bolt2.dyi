import { describe, expect, it } from 'vitest';

describe('stores/files module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/files');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});