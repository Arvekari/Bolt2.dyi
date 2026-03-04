import { describe, expect, it } from 'vitest';

describe('hooks/useIndexedDB module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useIndexedDB');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});