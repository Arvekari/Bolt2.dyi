import { describe, expect, it } from 'vitest';

describe('services/githubApiService module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/services/githubApiService');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});