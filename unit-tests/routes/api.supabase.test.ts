import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

globalThis.fetch = fetchMock as any;

import { action } from '~/routes/api.supabase';

describe('/api/supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for non-POST method', async () => {
    const response = await action({ request: new Request('http://localhost/api/supabase', { method: 'GET' }) } as any);
    const typedResponse = response as Response;
    expect(typedResponse.status).toBe(405);
  });

  it('returns 401 when upstream projects request fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));

    const response = await action({
      request: new Request('http://localhost/api/supabase', {
        method: 'POST',
        body: JSON.stringify({ token: 'bad-token' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const typedResponse = response as Response;
    expect(typedResponse.status).toBe(401);
  });

  it('returns deduplicated and sorted projects on success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { id: 'p1', created_at: '2026-03-02T00:00:00.000Z' },
          { id: 'p2', created_at: '2026-03-03T00:00:00.000Z' },
          { id: 'p1', created_at: '2026-03-01T00:00:00.000Z' },
        ]),
        { status: 200 },
      ),
    );

    const response = await action({
      request: new Request('http://localhost/api/supabase', {
        method: 'POST',
        body: JSON.stringify({ token: 'ok-token' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const typedResponse = response as Response;
    const data = (await typedResponse.json()) as any;

    expect(typedResponse.status).toBe(200);
    expect(data.stats.totalProjects).toBe(2);
    expect(data.stats.projects[0].id).toBe('p2');
    expect(data.stats.projects[1].id).toBe('p1');
  });
});
