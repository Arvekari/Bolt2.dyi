import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getProviderMock, getInstanceMock } = vi.hoisted(() => ({
  getProviderMock: vi.fn(),
  getInstanceMock: vi.fn(),
}));

vi.mock('~/lib/modules/llm/manager', () => ({
  LLMManager: {
    getInstance: getInstanceMock,
  },
}));

vi.mock('~/lib/stores/settings', () => ({
  LOCAL_PROVIDERS: ['Ollama', 'LMStudio'],
}));

import { loader } from '~/routes/api.configured-providers';

describe('/api/configured-providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInstanceMock.mockReturnValue({
      env: {},
      getProvider: getProviderMock,
    });
  });

  it('returns provider status list', async () => {
    getProviderMock
      .mockReturnValueOnce({ config: { baseUrlKey: 'OLLAMA_API_BASE_URL' } })
      .mockReturnValueOnce({ config: { apiTokenKey: 'LMSTUDIO_API_KEY' } });

    const response = await loader({
      context: { cloudflare: { env: { OLLAMA_API_BASE_URL: 'http://localhost:11434' } } },
    } as any);

    const data = await response.json();
    expect(Array.isArray(data.providers)).toBe(true);
    expect(data.providers).toHaveLength(2);
  });

  it('returns fallback values on error', async () => {
    getInstanceMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const response = await loader({ context: {} } as any);
    const data = await response.json();

    expect(data.providers[0].isConfigured).toBe(false);
    expect(data.providers[0].configMethod).toBe('none');
  });
});
