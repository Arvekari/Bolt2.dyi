import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

globalThis.fetch = fetchMock as any;

import { action, loader } from '~/routes/api.vercel-deploy';

describe('/api/vercel-deploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loader returns 400 when query params are missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/vercel-deploy') } as any);
    expect(response.status).toBe(400);
  });

  it('loader returns project and latest deploy on success', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'p1', name: 'proj1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ deployments: [{ id: 'd1', state: 'READY', url: 'proj1.vercel.app' }] }), { status: 200 }));

    const response = await loader({
      request: new Request('http://localhost/api/vercel-deploy?projectId=p1&token=t1'),
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.project.id).toBe('p1');
    expect(data.deploy.id).toBe('d1');
  });

  it('action returns 401 when token is missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/vercel-deploy', {
        method: 'POST',
        body: JSON.stringify({ chatId: 'c1', files: { 'index.html': 'x' } }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(401);
  });

  it('action creates project+deployment and returns success', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'p1', name: 'proj1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'dep1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ readyState: 'READY', url: 'proj1.vercel.app' }), { status: 200 }));

    const response = await action({
      request: new Request('http://localhost/api/vercel-deploy', {
        method: 'POST',
        body: JSON.stringify({
          token: 't1',
          chatId: 'c1',
          files: { '/index.html': '<h1>Hi</h1>' },
          sourceFiles: { 'package.json': '{"dependencies":{"next":"14.0.0"}}', 'pages/index.tsx': 'export default function Home() { return null; }' },
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deploy.id).toBe('dep1');
    expect(data.project.id).toBe('p1');
  });
});
