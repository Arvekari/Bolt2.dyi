import { describe, expect, it, vi } from 'vitest';
import { selectStarterTemplate } from '~/utils/selectStarterTemplate';

describe('selectStarterTemplate success', () => {
  it('parses selected template and title from llm response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          text: '<selection><templateName>Expo App</templateName><title>Expo todo</title></selection>',
        }),
      }),
    );

    const result = await selectStarterTemplate({ message: 'build app', model: 'x', provider: {} as any });
    expect(result).toEqual({ template: 'Expo App', title: 'Expo todo' });
  });
});
