import { describe, expect, it, vi } from 'vitest';

const { openaiModelMock, openaiCompletionMock, createOpenAIMock } = vi.hoisted(() => ({
  openaiModelMock: vi.fn(() => ({ kind: 'chat-model' })),
  openaiCompletionMock: vi.fn(() => ({ kind: 'completion-model' })),
  createOpenAIMock: vi.fn(() => {
    const client: any = (model: string) => openaiModelMock(model);
    client.completion = (model: string) => openaiCompletionMock(model);
    return client;
  }),
}));

vi.mock('~/lib/modules/llm/base-provider', () => ({
  BaseProvider: class {},
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: createOpenAIMock,
}));

describe('providers/openai module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/providers/openai');
    expect(module.default).toBeDefined();
  });

  it('routes codex models to completion endpoint factory', async () => {
    const module = await import('~/lib/modules/llm/providers/openai');
    const provider = new module.default() as any;

    provider.getProviderBaseUrlAndKey = vi.fn(() => ({ apiKey: 'test-key' }));

    provider.getModelInstance({
      model: 'gpt-5.3-codex',
      serverEnv: {} as any,
      apiKeys: { OpenAI: 'test-key' },
      providerSettings: {},
    });

    expect(openaiCompletionMock).toHaveBeenCalledWith('gpt-5.3-codex');
    expect(openaiModelMock).not.toHaveBeenCalled();
  });

  it('routes regular GPT chat models to chat endpoint factory', async () => {
    const module = await import('~/lib/modules/llm/providers/openai');
    const provider = new module.default() as any;

    provider.getProviderBaseUrlAndKey = vi.fn(() => ({ apiKey: 'test-key' }));

    provider.getModelInstance({
      model: 'gpt-4o',
      serverEnv: {} as any,
      apiKeys: { OpenAI: 'test-key' },
      providerSettings: {},
    });

    expect(openaiModelMock).toHaveBeenCalledWith('gpt-4o');
  });
});