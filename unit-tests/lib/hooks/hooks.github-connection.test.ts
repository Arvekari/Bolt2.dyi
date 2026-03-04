import { describe, expect, it } from 'vitest';

describe('hooks/useGitHubConnection module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useGitHubConnection');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});