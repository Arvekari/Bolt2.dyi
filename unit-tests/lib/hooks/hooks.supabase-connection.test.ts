import { describe, expect, it } from 'vitest';

describe('hooks/useSupabaseConnection module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useSupabaseConnection');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});