import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
  },
}));

globalThis.fetch = fetchMock as any;

import { loader } from '~/routes/api.github-template';

describe('/api/github-template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('returns 400 when repo is missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/github-template'), context: {} } as any);
    expect(response.status).toBe(400);
  });

  it('returns 500 when release endpoint fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 404, statusText: 'Not Found' }));

    const response = await loader({ request: new Request('http://localhost/api/github-template?repo=org/repo'), context: {} } as any);
    expect(response.status).toBe(500);
  });

  it('uses Cloudflare tree path in production and returns filtered files', async () => {
    process.env.NODE_ENV = 'production';

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ default_branch: 'main' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tree: [
              { type: 'blob', path: 'src/index.ts', size: 120 },
              { type: 'blob', path: '.git/config', size: 12 },
              { type: 'blob', path: 'pnpm-lock.yaml', size: 200000 },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: Buffer.from('console.log("ok")', 'utf8').toString('base64'),
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: Buffer.from('lockfile', 'utf8').toString('base64'),
          }),
          { status: 200 },
        ),
      );

    const response = await loader({
      request: new Request('http://localhost/api/github-template?repo=org/repo'),
      context: { cloudflare: { env: { CF_PAGES: '1' } } },
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data.find((f: any) => f.path === 'src/index.ts')).toBeTruthy();
    expect(data.find((f: any) => f.path === 'pnpm-lock.yaml')).toBeTruthy();
  });
});
