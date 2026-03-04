import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

globalThis.fetch = fetchMock as any;

import { action, loader } from '~/routes/api.git-proxy.$';

describe('/api/git-proxy/*', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when proxy path is missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/git-proxy'), params: { '*': undefined } } as any);
    expect(response.status).toBe(400);
  });

  it('returns CORS preflight response for OPTIONS', async () => {
    const response = await action({
      request: new Request('http://localhost/api/git-proxy/github.com/user/repo', { method: 'OPTIONS' }),
      params: { '*': 'github.com/user/repo' },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('proxies request and returns upstream response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('ok', {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/plain' },
      }),
    );

    const response = await loader({
      request: new Request('http://localhost/api/git-proxy/github.com/user/repo?x=1', {
        headers: { Accept: 'application/json' },
      }),
      params: { '*': 'github.com/user/repo' },
    } as any);

    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('ok');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
