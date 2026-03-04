import { describe, expect, it } from 'vitest';

describe('hooks/index module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});