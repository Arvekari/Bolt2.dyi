import { describe, expect, it } from 'vitest';

describe('hooks/useGitLabConnection module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useGitLabConnection');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});