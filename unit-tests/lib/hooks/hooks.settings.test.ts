import { describe, expect, it } from 'vitest';

describe('hooks/useSettings module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useSettings');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});