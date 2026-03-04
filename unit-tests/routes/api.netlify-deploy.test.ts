import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

globalThis.fetch = fetchMock as any;

import { action } from '~/routes/api.netlify-deploy';

describe('/api/netlify-deploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when token is missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/netlify-deploy', {
        method: 'POST',
        body: JSON.stringify({ chatId: 'c1', files: { 'index.html': '<h1>Hi</h1>' } }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(401);
  });

  it('returns upstream status when site creation fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'bad token' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await action({
      request: new Request('http://localhost/api/netlify-deploy', {
        method: 'POST',
        body: JSON.stringify({ token: 'x', chatId: 'c1', files: { 'index.html': '<h1>Hi</h1>' } }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(403);
  });

  it('returns success for deploy ready state', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'site1', name: 'n1', url: 'https://n1.netlify.app' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'dep1', state: 'prepared' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'dep1', state: 'ready', ssl_url: 'https://n1.netlify.app' }), { status: 200 }));

    const response = await action({
      request: new Request('http://localhost/api/netlify-deploy', {
        method: 'POST',
        body: JSON.stringify({ token: 'x', chatId: 'c1', files: { 'index.html': '<h1>Hi</h1>' } }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deploy.id).toBe('dep1');
    expect(data.site.id).toBe('site1');
  });
});
