import { describe, expect, it } from 'vitest';

describe('api/connection module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/api/connection');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});