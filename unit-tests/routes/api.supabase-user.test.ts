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

import { action, loader } from '~/routes/api.supabase-user';

describe('/api/supabase-user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiKeysMock.mockResolvedValue({});
  });

  it('loader returns 401 when supabase token missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/supabase-user'), context: {} } as any);
    expect(response.status).toBe(401);
  });

  it('loader returns mapped user and projects', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_SUPABASE_ACCESS_TOKEN: 'token' });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { id: 'p1', name: 'proj', region: 'eu', status: 'ACTIVE', organization_id: 'org1', created_at: '2026-03-03' },
        ]),
        { status: 200 },
      ),
    );

    const response = await loader({ request: new Request('http://localhost/api/supabase-user'), context: {} } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toMatchObject({ id: 'org1', name: 'Supabase User' });
    expect(data.projects).toHaveLength(1);
  });

  it('action get_projects returns stats', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_SUPABASE_ACCESS_TOKEN: 'token' });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 'p1', name: 'proj', region: 'eu', status: 'ACTIVE', organization_id: 'org1', created_at: '2026-03-03' }]), {
        status: 200,
      }),
    );

    const form = new FormData();
    form.set('action', 'get_projects');

    const response = await action({ request: new Request('http://localhost/api/supabase-user', { method: 'POST', body: form }), context: {} } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.totalProjects).toBe(1);
  });

  it('action get_api_keys requires projectId', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_SUPABASE_ACCESS_TOKEN: 'token' });

    const form = new FormData();
    form.set('action', 'get_api_keys');

    const response = await action({ request: new Request('http://localhost/api/supabase-user', { method: 'POST', body: form }), context: {} } as any);
    expect(response.status).toBe(400);
  });

  it('action get_api_keys returns mapped keys', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_SUPABASE_ACCESS_TOKEN: 'token' });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([{ name: 'anon', api_key: 'k1' }]), { status: 200 }));

    const form = new FormData();
    form.set('action', 'get_api_keys');
    form.set('projectId', 'p1');

    const response = await action({ request: new Request('http://localhost/api/supabase-user', { method: 'POST', body: form }), context: {} } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.apiKeys[0]).toMatchObject({ name: 'anon', api_key: 'k1' });
  });

  it('action returns 400 for invalid action', async () => {
    resolveApiKeysMock.mockResolvedValue({ VITE_SUPABASE_ACCESS_TOKEN: 'token' });

    const form = new FormData();
    form.set('action', 'invalid');

    const response = await action({ request: new Request('http://localhost/api/supabase-user', { method: 'POST', body: form }), context: {} } as any);
    expect(response.status).toBe(400);
  });
});
