import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getProviderMock, getInstanceMock, resolveApiKeysMock } = vi.hoisted(() => ({
  getProviderMock: vi.fn(),
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

import { loader } from '~/routes/api.check-env-key';

describe('/api/check-env-key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInstanceMock.mockReturnValue({
      getProvider: getProviderMock,
      env: {},
    });
    resolveApiKeysMock.mockResolvedValue({});
  });

  it('returns false when provider query is missing', async () => {
    const response = await loader({ request: new Request('http://localhost/api/check-env-key'), context: {} } as any);
    const data = await response.json();
    expect(data.isSet).toBe(false);
  });

  it('returns false when provider has no token key config', async () => {
    getProviderMock.mockReturnValue({ config: {} });

    const response = await loader({
      request: new Request('http://localhost/api/check-env-key?provider=OpenAI'),
      context: { cloudflare: { env: {} } },
    } as any);
    const data = await response.json();

    expect(data.isSet).toBe(false);
  });

  it('returns true when key exists in cookie-based api keys', async () => {
    getProviderMock.mockReturnValue({ config: { apiTokenKey: 'OPENAI_API_KEY' } });
    resolveApiKeysMock.mockResolvedValue({ OpenAI: 'secret' });

    const response = await loader({
      request: new Request('http://localhost/api/check-env-key?provider=OpenAI', { headers: { Cookie: 'a=b' } }),
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(data.isSet).toBe(true);
  });

  it('returns true when key exists in env variables', async () => {
    getProviderMock.mockReturnValue({ config: { apiTokenKey: 'OPENAI_API_KEY' } });
    resolveApiKeysMock.mockResolvedValue({});

    const response = await loader({
      request: new Request('http://localhost/api/check-env-key?provider=OpenAI'),
      context: { cloudflare: { env: { OPENAI_API_KEY: 'abc' } } },
    } as any);

    const data = await response.json();
    expect(data.isSet).toBe(true);
  });
});
