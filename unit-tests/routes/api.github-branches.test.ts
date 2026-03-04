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

import { action, loader } from '~/routes/api.github-branches';

describe('/api/github-branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiKeysMock.mockResolvedValue({});
  });

  it('loader returns 400 when owner/repo are missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/github-branches'), context: {} } as any);
    expect(response.status).toBe(400);
  });

  it('loader returns 401 when github token is not found', async () => {
    const response = await loader({
      request: new Request('http://localhost/api/github-branches?owner=o&repo=r'),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(401);
  });

  it('loader returns 404 when repository is not found', async () => {
    resolveApiKeysMock.mockResolvedValue({ GITHUB_API_KEY: 'token' });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }));

    const response = await loader({
      request: new Request('http://localhost/api/github-branches?owner=o&repo=r'),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(404);
  });

  it('action returns transformed branches with default branch first', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ default_branch: 'main' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { name: 'feature-a', commit: { sha: '222', url: 'u2' }, protected: false },
            { name: 'main', commit: { sha: '111', url: 'u1' }, protected: true },
          ]),
          { status: 200 },
        ),
      );

    const response = await action({
      request: new Request('http://localhost/api/github-branches', {
        method: 'POST',
        body: JSON.stringify({ owner: 'o', repo: 'r', token: 'token' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      context: {},
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.defaultBranch).toBe('main');
    expect(data.total).toBe(2);
    expect(data.branches[0]).toMatchObject({ name: 'main', isDefault: true, sha: '111' });
    expect(data.branches[1]).toMatchObject({ name: 'feature-a', isDefault: false, sha: '222' });
  });
});
