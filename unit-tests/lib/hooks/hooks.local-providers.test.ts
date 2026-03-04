import { describe, expect, it } from 'vitest';

describe('hooks/useLocalProviders module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useLocalProviders');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});