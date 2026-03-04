import { describe, expect, it } from 'vitest';

describe('hooks/useSearchFilter module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useSearchFilter');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});