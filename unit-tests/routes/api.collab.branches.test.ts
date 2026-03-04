import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCurrentUserFromRequestMock, listCollabBranchesMock, mergeCollabBranchToMainMock } = vi.hoisted(() => ({
  getCurrentUserFromRequestMock: vi.fn(),
  listCollabBranchesMock: vi.fn(),
  mergeCollabBranchToMainMock: vi.fn(),
}));

vi.mock('~/lib/.server/auth', () => ({
  getCurrentUserFromRequest: getCurrentUserFromRequestMock,
}));

vi.mock('~/lib/.server/persistence', () => ({
  listCollabBranches: listCollabBranchesMock,
  mergeCollabBranchToMain: mergeCollabBranchToMainMock,
}));

import { action, loader } from '~/routes/api.collab.branches';

describe('/api/collab/branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserFromRequestMock.mockResolvedValue({ userId: 'u1' });
  });

  it('loader returns 401 when unauthorized', async () => {
    getCurrentUserFromRequestMock.mockResolvedValueOnce(null);
    const response = await loader({ request: new Request('http://localhost/api/collab/branches'), context: {} } as any);
    expect(response.status).toBe(401);
  });

  it('loader returns 400 when conversationId is missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/collab/branches'), context: {} } as any);
    expect(response.status).toBe(400);
  });

  it('action returns 400 for invalid merge payload', async () => {
    const response = await action({
      request: new Request('http://localhost/api/collab/branches', {
        method: 'POST',
        body: JSON.stringify({ intent: 'mergeToMain' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      context: {},
    } as any);
    expect(response.status).toBe(400);
  });

  it('action returns mergedCount on successful merge', async () => {
    mergeCollabBranchToMainMock.mockResolvedValue({ mergedCount: 4 });

    const response = await action({
      request: new Request('http://localhost/api/collab/branches', {
        method: 'POST',
        body: JSON.stringify({ intent: 'mergeToMain', conversationId: 'c1', sourceBranchId: 'b1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      context: {},
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.mergedCount).toBe(4);
  });
});
