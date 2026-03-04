import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isAllowedUrlMock, fetchMock } = vi.hoisted(() => ({
  isAllowedUrlMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('~/utils/url', () => ({
  isAllowedUrl: isAllowedUrlMock,
}));

globalThis.fetch = fetchMock as any;

import { action } from '~/routes/api.web-search';

describe('/api/web-search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedUrlMock.mockReturnValue(true);
  });

  it('returns 405 for non-POST methods', async () => {
    const response = await action({ request: new Request('http://localhost/api/web-search', { method: 'GET' }) } as any);
    expect(response.status).toBe(405);
  });

  it('returns 400 when url is missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/web-search', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns 400 when url is not allowed', async () => {
    isAllowedUrlMock.mockReturnValue(false);

    const response = await action({
      request: new Request('http://localhost/api/web-search', {
        method: 'POST',
        body: JSON.stringify({ url: 'http://blocked.local' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns 502 when upstream fetch fails with non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('bad gateway', { status: 500, statusText: 'Server Error' }));

    const response = await action({
      request: new Request('http://localhost/api/web-search', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(502);
  });

  it('returns parsed page data for valid html content', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        '<html><head><title>Example Title</title><meta name="description" content="Example description" /></head><body><h1>Hello</h1><script>ignore</script></body></html>',
        {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        },
      ),
    );

    const response = await action({
      request: new Request('http://localhost/api/web-search', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Example Title');
    expect(data.data.description).toBe('Example description');
    expect(data.data.content).toContain('Hello');
    expect(data.data.sourceUrl).toBe('https://example.com');
  });
});
