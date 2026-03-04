import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

globalThis.fetch = fetchMock as any;

import { action } from '~/routes/api.supabase.variables';

describe('/api/supabase/variables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when projectId or token is missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/supabase/variables', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns upstream status when api keys request fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('forbidden', { status: 403, statusText: 'Forbidden' }));

    const response = await action({
      request: new Request('http://localhost/api/supabase/variables', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1', token: 't1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(403);
  });

  it('returns API keys on success', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([{ name: 'anon', api_key: 'k1' }]), { status: 200 }));

    const response = await action({
      request: new Request('http://localhost/api/supabase/variables', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1', token: 't1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.apiKeys[0].name).toBe('anon');
  });
});
