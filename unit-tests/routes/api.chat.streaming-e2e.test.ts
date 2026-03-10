import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  streamTextMock,
  resolveApiKeysMock,
  resolveProviderSettingsMock,
  resolveCustomPromptMock,
  processMcpMessagesForRequestMock,
} = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
  resolveApiKeysMock: vi.fn(),
  resolveProviderSettingsMock: vi.fn(),
  resolveCustomPromptMock: vi.fn(),
  processMcpMessagesForRequestMock: vi.fn(),
}));

vi.mock('~/lib/.server/llm/constants', () => ({
  MAX_RESPONSE_SEGMENTS: 3,
  MAX_TOKENS: 4096,
}));

vi.mock('~/lib/common/prompts/prompts', () => ({
  CONTINUE_PROMPT: 'continue',
}));

vi.mock('~/lib/.server/llm/stream-text', () => ({
  streamText: streamTextMock,
}));

vi.mock('~/lib/.server/llm/select-context', () => ({
  getFilePaths: vi.fn(() => []),
  selectContext: vi.fn(async () => undefined),
}));

vi.mock('~/lib/.server/llm/create-summary', () => ({
  createSummary: vi.fn(async () => 'summary'),
}));

vi.mock('~/lib/.server/llm/utils', () => ({
  extractPropertiesFromMessage: vi.fn(() => ({ model: 'gpt-4o-mini', provider: 'OpenAI' })),
}));

vi.mock('~/lib/services/mcpService', () => ({
  MCPService: {
    getInstance: () => ({
      toolsWithoutExecute: {},
      processToolCall: vi.fn(),
    }),
  },
}));

vi.mock('~/lib/.server/llm/stream-recovery', () => ({
  StreamRecoveryManager: class {
    startMonitoring() {}
    updateActivity() {}
    stop() {}
  },
}));

vi.mock('~/lib/api/cookies', () => ({
  resolveApiKeys: resolveApiKeysMock,
  resolveProviderSettings: resolveProviderSettingsMock,
  resolveCustomPrompt: resolveCustomPromptMock,
}));

vi.mock('~/lib/.server/agents/agentRunService', () => ({
  AgentRunService: {
    getInstance: () => ({
      createRun: vi.fn(() => ({ runId: 'run-1' })),
      getRun: vi.fn(() => ({ runId: 'run-1', state: 'running', steps: [], error: undefined })),
      beginStep: vi.fn(() => 'step-1'),
      completeStep: vi.fn(),
      completeRun: vi.fn(),
      failRun: vi.fn(),
    }),
  },
}));

vi.mock('~/integrations/mcp/adapter', () => ({
  processMcpMessagesForRequest: processMcpMessagesForRequestMock,
}));

vi.mock('~/platform/http/request-context', () => ({
  getRequestId: vi.fn(() => 'req-1'),
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { action } from '~/routes/api.chat';

describe('api.chat streaming end-to-end regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiKeysMock.mockResolvedValue({});
    resolveProviderSettingsMock.mockResolvedValue({});
    resolveCustomPromptMock.mockResolvedValue(undefined);
    processMcpMessagesForRequestMock.mockImplementation(async ({ messages }) => messages);
  });

  it('streams delayed text chunks to response body (guards against non-awaited stream bug)', async () => {
    streamTextMock.mockImplementation(async () => ({
      fullStream: (async function* () {
        // Delayed chunk reproduces the old race where execute returned too early.
        await new Promise((resolve) => setTimeout(resolve, 25));
        yield { type: 'text-delta', text: 'SMOKE_OK' };
        yield { type: 'finish', finishReason: 'stop', totalUsage: { promptTokens: 1, completionTokens: 1 } };
      })(),
    }));

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ id: 'u1', role: 'user', content: '[Model: gpt-4o-mini]\n\n[Provider: OpenAI]\n\nhello' }],
        files: {},
        contextOptimization: false,
        chatMode: 'build',
        maxLLMSteps: 1,
      }),
    });

    const response = (await action({ request, context: { cloudflare: { env: {} } } } as any)) as Response;

    expect(response.status).toBe(200);

    const text = await response.text();

    expect(text).toContain('SMOKE_OK');
    expect(streamTextMock).toHaveBeenCalled();
  });
});
