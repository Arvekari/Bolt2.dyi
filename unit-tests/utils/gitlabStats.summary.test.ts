import { describe, expect, it } from 'vitest';
import { calculateStatsSummary } from '~/utils/gitlabStats';

describe('gitlabStats.calculateStatsSummary', () => {
  it('aggregates stars/forks/privacy and activity', () => {
    const projects: any[] = [
      { star_count: 3, forks_count: 2, visibility: 'public' },
      { star_count: 1, forks_count: 0, visibility: 'private' },
    ];
    const events = [{ id: 1, action_name: 'pushed', project_id: 11, project: { name: 'repo' }, created_at: 'x' }];
    const groups = [{ id: 99 }];
    const snippets = [{ id: 's1' }, { id: 's2' }];
    const user = { followers: 7 };

    const summary = calculateStatsSummary(projects, events, groups, snippets, user);

    expect(summary.stars).toBe(4);
    expect(summary.forks).toBe(2);
    expect(summary.publicProjects).toBe(1);
    expect(summary.privateProjects).toBe(1);
    expect(summary.totalSnippets).toBe(2);
    expect(summary.followers).toBe(7);
    expect(summary.recentActivity).toHaveLength(1);
  });
});
