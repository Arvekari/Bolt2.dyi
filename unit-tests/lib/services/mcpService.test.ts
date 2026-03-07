import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_EXECUTION_APPROVAL } from '~/utils/constants';

const convertToModelMessagesMock = vi.fn(async (messages: unknown) => messages);
const formatDataStreamPartMock = vi.fn((partType: string, payload: unknown) => `${partType}:${JSON.stringify(payload)}`);
const experimentalCreateMCPClientMock = vi.fn();

vi.mock('ai', () => ({
  convertToModelMessages: (...args: unknown[]) => convertToModelMessagesMock(...args),
}));

vi.mock('@ai-sdk/ui-utils', () => ({
  formatDataStreamPart: (...args: unknown[]) => formatDataStreamPartMock(...args),
}));

vi.mock('@ai-sdk/mcp', () => ({
  experimental_createMCPClient: (...args: unknown[]) => experimentalCreateMCPClientMock(...args),
}));

vi.mock('@ai-sdk/mcp/mcp-stdio', () => ({
  Experimental_StdioMCPTransport: class MockStdioTransport {
    constructor(_config: unknown) {}
  },
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: class MockStreamableHTTPClientTransport {
    constructor(_url: URL, _options: unknown) {}
  },
}));

describe('app/lib/services/mcpService.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('closes stale MCP clients when config is refreshed', async () => {
    const firstClose = vi.fn(async () => {});
    const secondClose = vi.fn(async () => {});

    const firstClient = {
      tools: vi.fn(async () => ({ toolA: { description: 'tool A', execute: vi.fn(async () => 'A') } })),
      close: firstClose,
    };

    const secondClient = {
      tools: vi.fn(async () => ({ toolB: { description: 'tool B', execute: vi.fn(async () => 'B') } })),
      close: secondClose,
    };

    experimentalCreateMCPClientMock.mockResolvedValueOnce(firstClient).mockResolvedValueOnce(secondClient);

    const { MCPService } = await import('~/lib/services/mcpService');
    const service = MCPService.getInstance();

    await service.updateConfig({
      mcpServers: {
        alpha: {
          type: 'sse',
          url: 'https://example.com/alpha',
        },
      },
    });

    expect(service.isValidToolName('toolA')).toBe(true);

    await service.updateConfig({
      mcpServers: {
        beta: {
          type: 'sse',
          url: 'https://example.com/beta',
        },
      },
    });

    expect(firstClose).toHaveBeenCalledTimes(1);
    expect(secondClose).toHaveBeenCalledTimes(0);
    expect(service.isValidToolName('toolA')).toBe(false);
    expect(service.isValidToolName('toolB')).toBe(true);
    expect(experimentalCreateMCPClientMock).toHaveBeenCalledTimes(2);
  });

  it('reuses existing clients during availability checks', async () => {
    const toolsMock = vi.fn(async () => ({ toolA: { description: 'tool A', execute: vi.fn(async () => 'A') } }));
    const closeMock = vi.fn(async () => {});

    experimentalCreateMCPClientMock.mockResolvedValue({
      tools: toolsMock,
      close: closeMock,
    });

    const { MCPService } = await import('~/lib/services/mcpService');
    const service = MCPService.getInstance();

    await service.updateConfig({
      mcpServers: {
        alpha: {
          type: 'sse',
          url: 'https://example.com/alpha',
        },
      },
    });

    toolsMock.mockClear();

    await service.checkServersAvailabilities();

    expect(experimentalCreateMCPClientMock).toHaveBeenCalledTimes(1);
    expect(toolsMock).toHaveBeenCalledTimes(1);
    expect(closeMock).toHaveBeenCalledTimes(0);
  });

  it('skips model-conversion and execution for non-result tool invocations', async () => {
    const executeMock = vi.fn(async () => 'ok');

    experimentalCreateMCPClientMock.mockResolvedValue({
      tools: vi.fn(async () => ({
        speedTool: {
          description: 'speed tool',
          execute: executeMock,
        },
      })),
      close: vi.fn(async () => {}),
    });

    const { MCPService } = await import('~/lib/services/mcpService');
    const service = MCPService.getInstance();

    await service.updateConfig({
      mcpServers: {
        alpha: {
          type: 'sse',
          url: 'https://example.com/alpha',
        },
      },
    });

    const dataStream = {
      write: vi.fn(),
      writeMessageAnnotation: vi.fn(),
    };

    const messages = [
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolName: 'speedTool',
              toolCallId: 'call-1',
              state: 'call',
              args: { value: 1 },
            },
          },
        ],
      },
    ] as any;

    const processed = await service.processToolInvocations(messages, dataStream as any);

    expect(processed).toEqual(messages);
    expect(convertToModelMessagesMock).toHaveBeenCalledTimes(0);
    expect(executeMock).toHaveBeenCalledTimes(0);
    expect(dataStream.write).toHaveBeenCalledTimes(0);
  });

  it('converts model messages once for multiple result tool invocations', async () => {
    const executeMock = vi.fn(async () => 'ok');

    experimentalCreateMCPClientMock.mockResolvedValue({
      tools: vi.fn(async () => ({
        speedTool: {
          description: 'speed tool',
          execute: executeMock,
        },
      })),
      close: vi.fn(async () => {}),
    });

    const { MCPService } = await import('~/lib/services/mcpService');
    const service = MCPService.getInstance();

    await service.updateConfig({
      mcpServers: {
        alpha: {
          type: 'sse',
          url: 'https://example.com/alpha',
        },
      },
    });

    const dataStream = {
      write: vi.fn(),
      writeMessageAnnotation: vi.fn(),
    };

    const messages = [
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolName: 'speedTool',
              toolCallId: 'call-1',
              state: 'result',
              result: TOOL_EXECUTION_APPROVAL.APPROVE,
              args: { value: 1 },
            },
          },
          {
            type: 'tool-invocation',
            toolInvocation: {
              toolName: 'speedTool',
              toolCallId: 'call-2',
              state: 'result',
              result: TOOL_EXECUTION_APPROVAL.APPROVE,
              args: { value: 2 },
            },
          },
        ],
      },
    ] as any;

    await service.processToolInvocations(messages, dataStream as any);

    expect(convertToModelMessagesMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledTimes(2);
  });
});
