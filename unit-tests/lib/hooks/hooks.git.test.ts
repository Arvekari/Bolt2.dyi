import { describe, expect, it } from 'vitest';

describe('hooks/useGit module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useGit');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});