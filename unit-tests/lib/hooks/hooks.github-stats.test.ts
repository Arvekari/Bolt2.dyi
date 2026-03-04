import { describe, expect, it } from 'vitest';

describe('hooks/useGitHubStats module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useGitHubStats');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});