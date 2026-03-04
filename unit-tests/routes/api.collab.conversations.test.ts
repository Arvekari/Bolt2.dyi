import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentUserFromRequestMock,
  listCollabMessagesMock,
  listCollabConversationsMock,
  createCollabConversationMock,
  appendCollabMessageMock,
} = vi.hoisted(() => ({
  getCurrentUserFromRequestMock: vi.fn(),
  listCollabMessagesMock: vi.fn(),
  listCollabConversationsMock: vi.fn(),
  createCollabConversationMock: vi.fn(),
  appendCollabMessageMock: vi.fn(),
}));

vi.mock('~/lib/.server/auth', () => ({
  getCurrentUserFromRequest: getCurrentUserFromRequestMock,
}));

vi.mock('~/lib/.server/persistence', () => ({
  listCollabMessages: listCollabMessagesMock,
  listCollabConversations: listCollabConversationsMock,
  createCollabConversation: createCollabConversationMock,
  appendCollabMessage: appendCollabMessageMock,
}));

import { action, loader } from '~/routes/api.collab.conversations';

describe('/api/collab/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserFromRequestMock.mockResolvedValue({ userId: 'u1' });
  });

  it('loader returns 401 when unauthorized', async () => {
    getCurrentUserFromRequestMock.mockResolvedValueOnce(null);
    const response = await loader({ request: new Request('http://localhost/api/collab/conversations'), context: {} } as any);
    expect(response.status).toBe(401);
  });

  it('loader returns 400 when projectId is missing and no conversationId', async () => {
    const response = await loader({ request: new Request('http://localhost/api/collab/conversations'), context: {} } as any);
    expect(response.status).toBe(400);
  });

  it('loader returns messages when conversationId is provided', async () => {
    listCollabMessagesMock.mockResolvedValue([{ id: 'm1' }]);

    const response = await loader({
      request: new Request('http://localhost/api/collab/conversations?conversationId=c1&limit=10'),
      context: {},
    } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.messages).toHaveLength(1);
  });

  it('action addMessage returns 400 when conversationId/content missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/collab/conversations', {
        method: 'POST',
        body: JSON.stringify({ intent: 'addMessage' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      context: {},
    } as any);

    expect(response.status).toBe(400);
  });
});
