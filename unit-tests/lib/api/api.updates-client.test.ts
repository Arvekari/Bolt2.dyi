import { describe, expect, it } from 'vitest';

describe('api/updates module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/api/updates');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});