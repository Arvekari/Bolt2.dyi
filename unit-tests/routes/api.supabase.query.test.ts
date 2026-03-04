import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

globalThis.fetch = fetchMock as any;

import { action } from '~/routes/api.supabase.query';

describe('/api/supabase/query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for non-POST requests', async () => {
    const response = await action({ request: new Request('http://localhost/api/supabase/query', { method: 'GET' }) } as any);
    expect(response.status).toBe(405);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/supabase/query', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1', query: 'select 1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(401);
  });

  it('returns upstream error payload when supabase query fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'invalid query' }), { status: 400, statusText: 'Bad Request' }));

    const response = await action({
      request: new Request('http://localhost/api/supabase/query', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1', query: 'bad sql' }),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      }),
    } as any);

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error.message).toBe('invalid query');
  });

  it('returns result payload on success', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([{ id: 1 }]), { status: 200 }));

    const response = await action({
      request: new Request('http://localhost/api/supabase/query', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1', query: 'select * from x' }),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      }),
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data[0].id).toBe(1);
  });
});
