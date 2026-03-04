import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getInstanceMock, updateConfigMock } = vi.hoisted(() => ({
  getInstanceMock: vi.fn(),
  updateConfigMock: vi.fn(),
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: vi.fn(() => ({
    error: vi.fn(),
  })),
}));

vi.mock('~/lib/services/mcpService', () => ({
  MCPService: {
    getInstance: getInstanceMock,
  },
}));

import { action } from '~/routes/api.mcp-update-config';

describe('/api/mcp-update-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInstanceMock.mockReturnValue({ updateConfig: updateConfigMock });
  });

  it('returns 400 for invalid MCP config body', async () => {
    const response = await action({
      request: new Request('http://localhost/api/mcp-update-config', {
        method: 'POST',
        body: JSON.stringify(null),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns server tools on successful update', async () => {
    updateConfigMock.mockResolvedValue([{ server: 's1', tools: ['t1'] }]);

    const response = await action({
      request: new Request('http://localhost/api/mcp-update-config', {
        method: 'POST',
        body: JSON.stringify({ servers: [{ id: 's1' }] }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data[0].server).toBe('s1');
  });

  it('returns 500 when service throws', async () => {
    updateConfigMock.mockRejectedValue(new Error('mcp failed'));

    const response = await action({
      request: new Request('http://localhost/api/mcp-update-config', {
        method: 'POST',
        body: JSON.stringify({ servers: [{ id: 's1' }] }),
        headers: { 'Content-Type': 'application/json' },
      }),
    } as any);

    expect(response.status).toBe(500);
  });
});
