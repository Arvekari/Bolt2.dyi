import { describe, expect, it } from 'vitest';

describe('api/features module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/api/features');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});