import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.mock('~/lib/security', () => ({
  withSecurity: (handler: any) => handler,
}));

globalThis.fetch = fetchMock as any;

import { action } from '~/routes/api.gitlab-projects';

describe('/api/gitlab-projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when token is missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/gitlab-projects', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns 401 for invalid gitlab token', async () => {
    fetchMock.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));

    const response = await action({
      request: new Request('http://localhost/api/gitlab-projects', {
        method: 'POST',
        body: JSON.stringify({ token: 'bad-token' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(401);
  });

  it('returns transformed projects list on success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 12,
            name: 'proj',
            path_with_namespace: 'team/proj',
            description: null,
            web_url: 'https://gitlab.com/team/proj',
            http_url_to_repo: 'https://gitlab.com/team/proj.git',
            star_count: 3,
            forks_count: 2,
            updated_at: '2026-03-03',
            default_branch: 'main',
            visibility: 'private',
          },
        ]),
        { status: 200 },
      ),
    );

    const response = await action({
      request: new Request('http://localhost/api/gitlab-projects', {
        method: 'POST',
        body: JSON.stringify({ token: 'ok-token' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.projects[0]).toMatchObject({ id: 12, name: 'proj', path_with_namespace: 'team/proj', description: '' });
  });

  it('returns 503 when fetch throws connection error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('fetch failed'));

    const response = await action({
      request: new Request('http://localhost/api/gitlab-projects', {
        method: 'POST',
        body: JSON.stringify({ token: 'ok-token' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(503);
  });
});
