import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.mock('~/lib/security', () => ({
  withSecurity: (handler: any) => handler,
}));

globalThis.fetch = fetchMock as any;

import { action } from '~/routes/api.gitlab-branches';

describe('/api/gitlab-branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when token is missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/gitlab-branches', {
        method: 'POST',
        body: JSON.stringify({ projectId: 10 }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns 400 when projectId is missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/gitlab-branches', {
        method: 'POST',
        body: JSON.stringify({ token: 'ok-token' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns 404 when project is not found', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not found', { status: 404 }));

    const response = await action({
      request: new Request('http://localhost/api/gitlab-branches', {
        method: 'POST',
        body: JSON.stringify({ token: 'ok-token', projectId: 10 }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(404);
  });

  it('returns transformed branches and default branch on success', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { name: 'feature-x', commit: { id: '222', short_id: '222' }, protected: false, default: false, can_push: true },
            { name: 'develop', commit: { id: '111', short_id: '111' }, protected: true, default: false, can_push: false },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ default_branch: 'develop' }), { status: 200 }));

    const response = await action({
      request: new Request('http://localhost/api/gitlab-branches', {
        method: 'POST',
        body: JSON.stringify({ token: 'ok-token', projectId: 10 }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.defaultBranch).toBe('develop');
    expect(data.total).toBe(2);
    expect(data.branches[0]).toMatchObject({ name: 'develop', isDefault: true, sha: '111', canPush: false });
    expect(data.branches[1]).toMatchObject({ name: 'feature-x', isDefault: false, sha: '222', canPush: true });
  });

  it('falls back to main when project info request fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: 'main', commit: { id: 'aaa', short_id: 'aaa' }, protected: false, default: false, can_push: true }]), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response('error', { status: 500 }));

    const response = await action({
      request: new Request('http://localhost/api/gitlab-branches', {
        method: 'POST',
        body: JSON.stringify({ token: 'ok-token', projectId: 10 }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.defaultBranch).toBe('main');
    expect(data.branches[0].isDefault).toBe(true);
  });
});
