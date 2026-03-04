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

import { loader, action } from '~/routes/api.github-user';

describe('/api/github-user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiKeysMock.mockResolvedValue({});
  });

  it('loader returns 401 when token is missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/github-user'), context: {} } as any);
    expect(response.status).toBe(401);
  });

  it('loader returns mapped user profile on success', async () => {
    resolveApiKeysMock.mockResolvedValue({ GITHUB_API_KEY: 'token' });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ login: 'octo', name: 'Octo', avatar_url: 'a', html_url: 'h', type: 'User' }),
        { status: 200 },
      ),
    );

    const response = await loader({
      request: new Request('http://localhost/api/github-user', { headers: { Cookie: 'a=b' } }),
      context: {},
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.login).toBe('octo');
  });

  it('action get_token returns token', async () => {
    resolveApiKeysMock.mockResolvedValue({ GITHUB_API_KEY: 'token' });

    const form = new FormData();
    form.set('action', 'get_token');

    const response = await action({
      request: new Request('http://localhost/api/github-user', { method: 'POST', body: form }),
      context: {},
    } as any);

    const data = await response.json();
    expect(data.token).toBe('token');
  });

  it('action get_branches validates missing repo', async () => {
    resolveApiKeysMock.mockResolvedValue({ GITHUB_API_KEY: 'token' });

    const form = new FormData();
    form.set('action', 'get_branches');

    const response = await action({
      request: new Request('http://localhost/api/github-user', { method: 'POST', body: form }),
      context: {},
    } as any);

    expect(response.status).toBe(400);
  });

  it('action returns 400 for invalid action', async () => {
    resolveApiKeysMock.mockResolvedValue({ GITHUB_API_KEY: 'token' });

    const form = new FormData();
    form.set('action', 'invalid');

    const response = await action({
      request: new Request('http://localhost/api/github-user', { method: 'POST', body: form }),
      context: {},
    } as any);

    expect(response.status).toBe(400);
  });
});
