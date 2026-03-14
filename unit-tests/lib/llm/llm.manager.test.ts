import { describe, expect, it, vi } from 'vitest';
import { LLMManager } from '~/lib/modules/llm/manager';

describe('llm/manager module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/manager');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });

  it('does not cache empty dynamic model results for local providers', async () => {
    const manager = LLMManager.getInstance();
    const provider = manager.getProvider('Ollama');

    expect(provider).toBeDefined();

    if (!provider) {
      return;
    }

    const originalGetModelsFromCache = provider.getModelsFromCache.bind(provider);
    const originalStoreDynamicModels = provider.storeDynamicModels.bind(provider);
    const originalGetDynamicModels = provider.getDynamicModels?.bind(provider);

    const storeSpy = vi.fn();

    provider.getModelsFromCache = vi.fn(() => null);
    provider.storeDynamicModels = ((...args: Parameters<typeof originalStoreDynamicModels>) => {
      storeSpy(...args);
      return originalStoreDynamicModels(...args);
    }) as typeof provider.storeDynamicModels;
    provider.getDynamicModels = vi.fn(async () => []);

    try {
      const models = await manager.getModelListFromProvider(provider, {
        apiKeys: {},
        providerSettings: {},
        serverEnv: {},
      });

      expect(models).toEqual([]);
      expect(storeSpy).not.toHaveBeenCalled();
    } finally {
      provider.getModelsFromCache = originalGetModelsFromCache;
      provider.storeDynamicModels = originalStoreDynamicModels;
      provider.getDynamicModels = originalGetDynamicModels;
    }
  });
});