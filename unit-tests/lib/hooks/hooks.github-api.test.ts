import { describe, expect, it } from 'vitest';

describe('hooks/useGitHubAPI module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useGitHubAPI');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});