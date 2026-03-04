import { describe, expect, it } from 'vitest';
import { calculateProjectStats } from '~/utils/gitlabStats';

describe('gitlabStats.calculateProjectStats', () => {
  it('maps project fields and defaults counters', () => {
    const result = calculateProjectStats([
      {
        id: 1,
        name: 'repo-a',
        path_with_namespace: 'team/repo-a',
        description: 'A',
        http_url_to_repo: 'https://gitlab.com/team/repo-a',
        default_branch: 'main',
        updated_at: '2024-01-01',
        visibility: 'public',
      },
    ]);

    expect(result.projects[0]).toMatchObject({
      id: 1,
      name: 'repo-a',
      star_count: 0,
      forks_count: 0,
      visibility: 'public',
    });
  });
});
