import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkServersAvailabilitiesMock, getInstanceMock, loggerErrorMock } = vi.hoisted(() => {
  const checkServersAvailabilitiesMock = vi.fn();
  const getInstanceMock = vi.fn(() => ({
    checkServersAvailabilities: checkServersAvailabilitiesMock,
  }));
  const loggerErrorMock = vi.fn();

  return {
    checkServersAvailabilitiesMock,
    getInstanceMock,
    loggerErrorMock,
  };
});

vi.mock('~/lib/services/mcpService', () => ({
  MCPService: {
    getInstance: getInstanceMock,
  },
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: () => ({
    error: loggerErrorMock,
  }),
}));

import { loader } from '~/routes/api.mcp-check';

describe('/api/mcp-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns server tools when service succeeds', async () => {
    checkServersAvailabilitiesMock.mockResolvedValue([{ name: 'serverA', available: true }]);

    const response = await loader();
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe('serverA');
  });

  it('returns 500 with error payload when service throws', async () => {
    checkServersAvailabilitiesMock.mockRejectedValue(new Error('failed'));

    const response = await loader();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to check MCP servers');
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
