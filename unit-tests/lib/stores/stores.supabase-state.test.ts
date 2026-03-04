import { describe, expect, it } from 'vitest';

describe('stores/supabase module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/stores/supabase');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});