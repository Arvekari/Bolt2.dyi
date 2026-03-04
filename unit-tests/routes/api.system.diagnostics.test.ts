import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

globalThis.fetch = fetchMock as any;

import { loader } from '~/routes/api.system.diagnostics';

describe('/api/system/diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_ACCESS_TOKEN;
    delete process.env.NETLIFY_TOKEN;
  });

  it('returns diagnostic payload with cookie and api statuses', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('ok', { status: 200, statusText: 'OK' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200, statusText: 'OK' }));

    const response = await loader({
      request: new Request('http://localhost/api/system/diagnostics', {
        headers: { Cookie: 'githubToken=1;githubUsername=arva;netlifyToken=1' },
      }),
      context: { env: { GITHUB_ACCESS_TOKEN: 'x', NETLIFY_TOKEN: 'y' } },
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.environment.hasGithubToken).toBe(true);
    expect(data.environment.hasNetlifyToken).toBe(true);
    expect(data.cookies).toMatchObject({ hasGithubTokenCookie: true, hasGithubUsernameCookie: true, hasNetlifyCookie: true });
    expect(data.externalApis.github.isReachable).toBe(true);
    expect(data.externalApis.netlify.isReachable).toBe(true);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('marks external APIs unreachable when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('github down')).mockRejectedValueOnce(new Error('netlify down'));

    const response = await loader({
      request: new Request('http://localhost/api/system/diagnostics'),
      context: { env: {} },
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.externalApis.github.isReachable).toBe(false);
    expect(data.externalApis.netlify.isReachable).toBe(false);
    expect(data.externalApis.github.error).toContain('github down');
    expect(data.externalApis.netlify.error).toContain('netlify down');
  });
});
