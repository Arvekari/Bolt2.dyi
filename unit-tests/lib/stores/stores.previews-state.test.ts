import { describe, expect, it } from 'vitest';

describe('stores/previews module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/previews');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});