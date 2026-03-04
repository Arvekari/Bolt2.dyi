import { describe, expect, it } from 'vitest';

describe('stores/gitlabConnection module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/gitlabConnection');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});