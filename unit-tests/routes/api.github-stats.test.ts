import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveApiKeysMock, fetchMock } = vi.hoisted(() => ({
  resolveApiKeysMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('~/lib/api/cookies', () => ({
  resolveApiKeys: resolveApiKeysMock,
}));

vi.mock('~/lib/security', () => ({
  withSecurity: (handler: any) => handler,
}));

globalThis.fetch = fetchMock as any;

import { loader } from '~/routes/api.github-stats';

describe('/api/github-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiKeysMock.mockResolvedValue({});
  });

  it('returns 401 when github token is missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/github-stats'), context: {} } as any);
    expect(response.status).toBe(401);
  });

  it('returns 401 for invalid github token', async () => {
    resolveApiKeysMock.mockResolvedValue({ GITHUB_API_KEY: 'bad-token' });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));

    const response = await loader({ request: new Request('http://localhost/api/github-stats'), context: {} } as any);
    expect(response.status).toBe(401);
  });

  it('returns computed stats on success', async () => {
    resolveApiKeysMock.mockResolvedValue({ GITHUB_API_KEY: 'ok-token' });

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ followers: 7, public_gists: 3 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              name: 'repo1',
              full_name: 'org/repo1',
              html_url: 'https://github.com/org/repo1',
              clone_url: 'https://github.com/org/repo1.git',
              description: 'r1',
              private: false,
              language: 'TypeScript',
              updated_at: '2026-03-03',
              stargazers_count: 5,
              forks_count: 2,
              watchers_count: 3,
              topics: ['ai'],
              fork: false,
              archived: false,
              size: 10,
              default_branch: 'main',
              languages_url: 'u1',
            },
            {
              id: 2,
              name: 'repo2',
              full_name: 'org/repo2',
              html_url: 'https://github.com/org/repo2',
              clone_url: 'https://github.com/org/repo2.git',
              description: 'r2',
              private: true,
              language: 'JavaScript',
              updated_at: '2026-03-03',
              stargazers_count: 1,
              forks_count: 0,
              watchers_count: 1,
              topics: [],
              fork: false,
              archived: false,
              size: 20,
              default_branch: 'main',
              languages_url: 'u2',
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([{ name: 'main' }]), { status: 200, headers: { Link: '<x?page=4>; rel="last"' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ name: 'main' }]), { status: 200 }));

    const response = await loader({ request: new Request('http://localhost/api/github-stats'), context: {} } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.publicRepos).toBe(1);
    expect(data.privateRepos).toBe(1);
    expect(data.totalStars).toBe(6);
    expect(data.totalForks).toBe(2);
    expect(data.followers).toBe(7);
    expect(data.totalGists).toBe(3);
    expect(data.repos[0]).toMatchObject({ full_name: 'org/repo1', stargazers_count: 5 });
  });
});
