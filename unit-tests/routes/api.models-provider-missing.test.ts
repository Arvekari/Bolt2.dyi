import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllProvidersMock = vi.fn();
const getDefaultProviderMock = vi.fn();
const getProviderMock = vi.fn();

vi.mock('~/lib/modules/llm/manager', () => ({
  LLMManager: {
    getInstance: vi.fn(() => ({
      getAllProviders: getAllProvidersMock,
      getDefaultProvider: getDefaultProviderMock,
      getProvider: getProviderMock,
      getModelListFromProvider: vi.fn(),
      updateModelList: vi.fn(),
    })),
  },
}));

vi.mock('~/lib/api/cookies', () => ({
  resolveApiKeys: vi.fn(async () => ({ OpenAI: 'key' })),
  resolveProviderSettings: vi.fn(async () => ({ OpenAI: { enabled: true } })),
}));

import { loader } from '~/routes/api.models.$provider';

describe('/api/models/$provider missing provider', () => {
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

  it('returns empty model list when provider is unknown', async () => {
    getProviderMock.mockReturnValue(undefined);

    const response = await loader({
      request: new Request('http://localhost/api/models/unknown'),
      params: { provider: 'unknown' },
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.modelList).toEqual([]);
  });
});
