import { describe, expect, it } from 'vitest';

describe('services/gitlabApiService module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/services/gitlabApiService');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});