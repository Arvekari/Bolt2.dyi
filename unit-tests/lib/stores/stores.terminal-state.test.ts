import { describe, expect, it } from 'vitest';

describe('stores/terminal module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/terminal');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});