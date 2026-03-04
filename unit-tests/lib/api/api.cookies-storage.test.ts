import { describe, expect, it } from 'vitest';

describe('api/cookies module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/api/cookies');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});