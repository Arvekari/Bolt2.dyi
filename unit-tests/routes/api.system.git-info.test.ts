import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

globalThis.fetch = fetchMock as any;

import { loader } from '~/routes/api.system.git-info';

describe('/api/system/git-info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_ACCESS_TOKEN;
  });

  it('returns 401 when token missing for getUser action', async () => {
    const response = await loader({
      request: new Request('http://localhost/api/system/git-info?action=getUser'),
      context: { env: {} },
    } as any);

    const typedResponse = response as Response;
    expect(typedResponse.status).toBe(401);
  });

  it('returns github user payload for getUser action', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ login: 'arva' }), { status: 200 }));

    const response = await loader({
      request: new Request('http://localhost/api/system/git-info?action=getUser', {
        headers: { Authorization: 'Bearer token' },
      }),
      context: { env: {} },
    } as any);

    const typedResponse = response as Response;
    const data = (await typedResponse.json()) as any;
    expect(typedResponse.status).toBe(200);
    expect(data.user.login).toBe('arva');
  });

  it('returns repos and stats for getRepos action', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { name: 'repo1', stargazers_count: 5, forks_count: 2, language: 'TypeScript' },
            { name: 'repo2', stargazers_count: 1, forks_count: 0, language: 'JavaScript' },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'g1' }]), { status: 200 }));

    const response = await loader({
      request: new Request('http://localhost/api/system/git-info?action=getRepos', {
        headers: { Authorization: 'Bearer token' },
      }),
      context: { env: {} },
    } as any);

    const typedResponse = response as Response;
    const data = (await typedResponse.json()) as any;
    expect(typedResponse.status).toBe(200);
    expect(data.repos).toHaveLength(2);
    expect(data.stats.totalStars).toBe(6);
    expect(data.stats.totalForks).toBe(2);
    expect(data.stats.totalGists).toBe(1);
  });

  it('returns default local git info without action', async () => {
    const response = await loader({
      request: new Request('http://localhost/api/system/git-info'),
      context: { env: {} },
    } as any);
    const typedResponse = response as Response;
    const data = (await typedResponse.json()) as any;

    expect(typedResponse.status).toBe(200);
    expect(data.local).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });
});
