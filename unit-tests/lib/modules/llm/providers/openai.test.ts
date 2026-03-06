import { describe, expect, it, vi } from 'vitest';

const { openaiModelMock, openaiCompletionMock, openaiResponsesMock, createOpenAIMock } = vi.hoisted(() => ({
  openaiModelMock: vi.fn(() => ({ kind: 'chat-model' })),
  openaiCompletionMock: vi.fn(() => ({ kind: 'completion-model' })),
  openaiResponsesMock: vi.fn(() => ({ kind: 'responses-model' })),
  createOpenAIMock: vi.fn(() => {
    const client: any = (model: string) => openaiModelMock(model);
    client.completion = (model: string) => openaiCompletionMock(model);
    client.responses = (model: string) => openaiResponsesMock(model);
    return client;
  }),
}));

vi.mock('~/lib/modules/llm/base-provider', () => ({
  BaseProvider: class {},
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: createOpenAIMock,
}));

describe('lib/modules/llm/providers/openai', () => {
  it('uses responses factory for codex models', async () => {
    const module = await import('~/lib/modules/llm/providers/openai');
    const provider = new module.default() as any;
    provider.getProviderBaseUrlAndKey = vi.fn(() => ({ apiKey: 'test-key' }));

    provider.getModelInstance({
      model: 'gpt-5.3-codex',
      serverEnv: {} as any,
      apiKeys: { OpenAI: 'test-key' },
      providerSettings: {},
    });

    expect(openaiResponsesMock).toHaveBeenCalledWith('gpt-5.3-codex');
    expect(openaiModelMock).not.toHaveBeenCalled();
    expect(openaiCompletionMock).not.toHaveBeenCalled();
  });
});
