import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAllProvidersMock, getInstanceMock, resolveApiKeysMock } = vi.hoisted(() => ({
  getAllProvidersMock: vi.fn(),
  getInstanceMock: vi.fn(),
  resolveApiKeysMock: vi.fn(),
}));

vi.mock('~/lib/modules/llm/manager', () => ({
  LLMManager: {
    getInstance: getInstanceMock,
  },
}));

vi.mock('~/lib/api/cookies', () => ({
  resolveApiKeys: resolveApiKeysMock,
}));

import { loader } from '~/routes/api.export-api-keys';

describe('/api/export-api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInstanceMock.mockReturnValue({
      getAllProviders: getAllProvidersMock,
      env: { ENV_KEY: 'fromManager' },
    });
    resolveApiKeysMock.mockResolvedValue({ OpenAI: 'cookie-key' });
  });

  it('returns cookie keys and env-derived keys for providers', async () => {
    getAllProvidersMock.mockReturnValue([
      { name: 'OpenAI', config: { apiTokenKey: 'OPENAI_API_KEY' } },
      { name: 'Anthropic', config: { apiTokenKey: 'ENV_KEY' } },
      { name: 'NoToken', config: {} },
    ]);

    const response = await loader({
      request: new Request('http://localhost/api/export-api-keys', { headers: { Cookie: 'a=b' } }),
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(data.OpenAI).toBe('cookie-key');
    expect(data.Anthropic).toBe('fromManager');
    expect(data.NoToken).toBeUndefined();
  });

  it('prefers cloudflare env over manager env when cookie key missing', async () => {
    resolveApiKeysMock.mockResolvedValue({});
    getAllProvidersMock.mockReturnValue([{ name: 'OpenAI', config: { apiTokenKey: 'OPENAI_API_KEY' } }]);

    const response = await loader({
      request: new Request('http://localhost/api/export-api-keys'),
      context: { cloudflare: { env: { OPENAI_API_KEY: 'cf-key' } } },
    } as any);

    const data = await response.json();
    expect(data.OpenAI).toBe('cf-key');
  });
});
