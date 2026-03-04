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

import { loader, action } from '~/routes/api.netlify-user';

describe('/api/netlify-user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiKeysMock.mockResolvedValue({});
  });

  it('loader returns 401 when token missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/netlify-user'), context: {} } as any);
    expect(response.status).toBe(401);
  });

  it('loader returns user info on success', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_NETLIFY_ACCESS_TOKEN: 'token' });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1', name: 'N', email: 'n@example.com', avatar_url: null, full_name: 'Net User' }), {
        status: 200,
      }),
    );

    const response = await loader({ request: new Request('http://localhost/api/netlify-user'), context: {} } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toBe('n@example.com');
  });

  it('action get_sites returns mapped site list', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_NETLIFY_ACCESS_TOKEN: 'token' });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ id: 's1', name: 'site1', url: 'u', admin_url: 'a', build_settings: {}, created_at: 'c', updated_at: 'u' }]),
        { status: 200 },
      ),
    );

    const form = new FormData();
    form.set('action', 'get_sites');

    const response = await action({ request: new Request('http://localhost/api/netlify-user', { method: 'POST', body: form }), context: {} } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalSites).toBe(1);
  });

  it('action returns 400 for invalid action', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_NETLIFY_ACCESS_TOKEN: 'token' });

    const form = new FormData();
    form.set('action', 'invalid');

    const response = await action({ request: new Request('http://localhost/api/netlify-user', { method: 'POST', body: form }), context: {} } as any);
    expect(response.status).toBe(400);
  });
});
