import { describe, expect, it } from 'vitest';
import { calculateStatsSummary } from '~/utils/githubStats';

describe('githubStats', () => {
  it('returns an object preserving input fields', () => {
    const input = {
      publicRepos: 3,
      followers: 2,
      following: 1,
      stars: 5,
      forks: 4,
      repositories: [],
      recentActivity: [],
      lastUpdated: '2024-01-01T00:00:00.000Z',
    } as any;

    const result = calculateStatsSummary(input);
    expect(result).toMatchObject(input);
  });
});
