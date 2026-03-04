import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllProvidersMock = vi.fn();
const getDefaultProviderMock = vi.fn();
const getProviderMock = vi.fn();
const getModelListFromProviderMock = vi.fn();

vi.mock('~/lib/modules/llm/manager', () => ({
  LLMManager: {
    getInstance: vi.fn(() => ({
      getAllProviders: getAllProvidersMock,
      getDefaultProvider: getDefaultProviderMock,
      getProvider: getProviderMock,
      getModelListFromProvider: getModelListFromProviderMock,
      updateModelList: vi.fn(),
    })),
  },
}));

vi.mock('~/lib/api/cookies', () => ({
  resolveApiKeys: vi.fn(async () => ({ OpenAI: 'key' })),
  resolveProviderSettings: vi.fn(async () => ({ OpenAI: { enabled: true } })),
}));

import { loader } from '~/routes/api.models.$provider';

describe('/api/models/$provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getAllProvidersMock.mockReturnValue([
      { name: 'OpenAI', staticModels: [], getApiKeyLink: 'https://x', labelForGetApiKey: 'Get key', icon: 'i' },
    ]);
    getDefaultProviderMock.mockReturnValue({
      name: 'OpenAI',
      staticModels: [],
      getApiKeyLink: 'https://x',
      labelForGetApiKey: 'Get key',
      icon: 'i',
    });
  });

  it('returns provider-specific model list when provider param is present', async () => {
    const provider = { name: 'OpenAI' };
    getProviderMock.mockReturnValue(provider);
    getModelListFromProviderMock.mockResolvedValue([{ name: 'gpt-5.3-codex' }]);

    const response = await loader({
      request: new Request('http://localhost/api/models/OpenAI'),
      params: { provider: 'OpenAI' },
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.modelList[0].name).toBe('gpt-5.3-codex');
    expect(getModelListFromProviderMock).toHaveBeenCalledWith(provider, expect.any(Object));
  });
});
