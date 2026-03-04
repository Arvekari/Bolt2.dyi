import { describe, expect, it } from 'vitest';

describe('hooks/useGitLabAPI module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useGitLabAPI');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});