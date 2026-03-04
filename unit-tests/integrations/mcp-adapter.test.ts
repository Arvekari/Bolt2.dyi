import { describe, expect, it, vi } from 'vitest';

const {
  processToolInvocationsMock,
} = vi.hoisted(() => ({
  processToolInvocationsMock: vi.fn(),
}));

vi.mock('~/lib/services/mcpService', () => ({
  MCPService: {
    getInstance: () => ({
      processToolInvocations: processToolInvocationsMock,
    }),
  },
}));

import { processMcpMessagesForRequest } from '~/integrations/mcp/adapter';

describe('mcp adapter', () => {
  it('processes tool invocations in request-scoped adapter context', async () => {
    processToolInvocationsMock.mockResolvedValue([{ role: 'user', content: 'ok' }]);

    const result = await processMcpMessagesForRequest({
      requestId: 'req-1',
      messages: [{ role: 'user', content: 'hello' }],
      dataStream: {},
    });

    expect(result.length).toBe(1);
    expect(processToolInvocationsMock).toHaveBeenCalledTimes(1);
  });
});
