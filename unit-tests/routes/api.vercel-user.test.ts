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

import { loader, action } from '~/routes/api.vercel-user';

describe('/api/vercel-user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiKeysMock.mockResolvedValue({});
  });

  it('loader returns 401 when token missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/vercel-user'), context: {} } as any);
    const typedResponse = response as Response;
    expect(typedResponse.status).toBe(401);
  });

  it('loader accepts bearer auth header and returns user', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: '1', name: 'V', email: 'v@example.com', avatar: null, username: 'vercel' } }), {
        status: 200,
      }),
    );

    const response = await loader({
      request: new Request('http://localhost/api/vercel-user', { headers: { Authorization: 'Bearer token' } }),
      context: {},
    } as any);

    const typedResponse = response as Response;
    const data = (await typedResponse.json()) as any;
    expect(typedResponse.status).toBe(200);
    expect(data.username).toBe('vercel');
  });

  it('action get_projects returns mapped projects', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_VERCEL_ACCESS_TOKEN: 'token' });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ projects: [{ id: 'p1', name: 'proj', framework: 'nextjs', public: true, createdAt: 'c', updatedAt: 'u' }] }),
        { status: 200 },
      ),
    );

    const form = new FormData();
    form.set('action', 'get_projects');

    const response = await action({ request: new Request('http://localhost/api/vercel-user', { method: 'POST', body: form }), context: {} } as any);
    const typedResponse = response as Response;
    const data = (await typedResponse.json()) as any;

    expect(typedResponse.status).toBe(200);
    expect(data.totalProjects).toBe(1);
  });

  it('action returns 400 for invalid action', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_VERCEL_ACCESS_TOKEN: 'token' });

    const form = new FormData();
    form.set('action', 'invalid');

    const response = await action({ request: new Request('http://localhost/api/vercel-user', { method: 'POST', body: form }), context: {} } as any);
    const typedResponse = response as Response;
    expect(typedResponse.status).toBe(400);
  });
});
