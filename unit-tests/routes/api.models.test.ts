import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllProvidersMock = vi.fn();
const getDefaultProviderMock = vi.fn();
const getProviderMock = vi.fn();
const getModelListFromProviderMock = vi.fn();
const updateModelListMock = vi.fn();

vi.mock('~/lib/modules/llm/manager', () => ({
  LLMManager: {
    getInstance: vi.fn(() => ({
      getAllProviders: getAllProvidersMock,
      getDefaultProvider: getDefaultProviderMock,
      getProvider: getProviderMock,
      getModelListFromProvider: getModelListFromProviderMock,
      updateModelList: updateModelListMock,
    })),
  },
}));

vi.mock('~/lib/api/cookies', () => ({
  resolveApiKeys: vi.fn(async () => ({ OpenAI: 'key' })),
  resolveProviderSettings: vi.fn(async () => ({ OpenAI: { enabled: true } })),
}));

import { loader } from '~/routes/api.models';

describe('/api/models', () => {
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
    updateModelListMock.mockResolvedValue([{ name: 'gpt-4o' }]);
  });

  it('returns all models when provider param is not set', async () => {
    const response = await loader({
      request: new Request('http://localhost/api/models'),
      params: {},
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(Array.isArray(data.modelList)).toBe(true);
    expect(data.modelList[0].name).toBe('gpt-4o');
    expect(updateModelListMock).toHaveBeenCalled();
  });

  it('returns provider-specific model list when provider param is set', async () => {
    const provider = { name: 'OpenAI' };
    getProviderMock.mockReturnValue(provider);
    getModelListFromProviderMock.mockResolvedValue([{ name: 'gpt-5-codex' }]);

    const response = await loader({
      request: new Request('http://localhost/api/models/openai'),
      params: { provider: 'OpenAI' },
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(data.modelList[0].name).toBe('gpt-5-codex');
    expect(getModelListFromProviderMock).toHaveBeenCalledWith(provider, expect.any(Object));
  });
});
