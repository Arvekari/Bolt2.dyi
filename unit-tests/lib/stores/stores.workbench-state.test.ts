import { describe, expect, it } from 'vitest';

describe('stores/workbench module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/workbench');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});