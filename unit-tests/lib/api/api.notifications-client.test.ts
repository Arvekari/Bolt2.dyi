import { describe, expect, it } from 'vitest';

describe('api/notifications module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/api/notifications');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});