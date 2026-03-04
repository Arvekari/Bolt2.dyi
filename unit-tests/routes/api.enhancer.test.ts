import { beforeEach, describe, expect, it, vi } from 'vitest';

const { streamTextMock, resolveApiKeysMock, resolveProviderSettingsMock, loggerErrorMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
  resolveApiKeysMock: vi.fn(),
  resolveProviderSettingsMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('~/lib/.server/llm/stream-text', () => ({
  streamText: streamTextMock,
}));

vi.mock('~/lib/api/cookies', () => ({
  resolveApiKeys: resolveApiKeysMock,
  resolveProviderSettings: resolveProviderSettingsMock,
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: () => ({
    error: loggerErrorMock,
  }),
}));

import { action } from '~/routes/api.enhancer';

describe('/api/enhancer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiKeysMock.mockResolvedValue({});
    resolveProviderSettingsMock.mockResolvedValue({});
  });

  it('throws 400 for missing model', async () => {
    await expect(
      action({
        request: new Request('http://localhost/api/enhancer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'x', model: '', provider: { name: 'OpenAI' } }),
        }),
        context: { cloudflare: { env: {} } },
      } as any),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 for missing provider name', async () => {
    await expect(
      action({
        request: new Request('http://localhost/api/enhancer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'x', model: 'gpt-4o', provider: {} }),
        }),
        context: { cloudflare: { env: {} } },
      } as any),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('returns SSE response on success', async () => {
    const textStream = new ReadableStream({
      start(controller) {
        controller.enqueue('data: ok\n\n');
        controller.close();
      },
    });

    async function* fullStreamGenerator() {
      yield { type: 'text', text: 'ok' } as any;
    }

    streamTextMock.mockResolvedValue({
      textStream,
      fullStream: fullStreamGenerator(),
    });

    const response = await action({
      request: new Request('http://localhost/api/enhancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hello', model: 'gpt-4o', provider: { name: 'OpenAI' } }),
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
  });

  it('throws 401 when streamText reports API key issue', async () => {
    streamTextMock.mockRejectedValue(new Error('API key missing'));

    await expect(
      action({
        request: new Request('http://localhost/api/enhancer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'x', model: 'gpt-4o', provider: { name: 'OpenAI' } }),
        }),
        context: { cloudflare: { env: {} } },
      } as any),
    ).rejects.toMatchObject({ status: 401 });
  });
});
