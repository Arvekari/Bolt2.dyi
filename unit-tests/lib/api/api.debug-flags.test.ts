import { describe, expect, it } from 'vitest';

describe('api/debug module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/api/debug');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});