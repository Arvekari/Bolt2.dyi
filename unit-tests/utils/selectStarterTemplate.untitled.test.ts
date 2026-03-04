import { describe, expect, it, vi } from 'vitest';
import { selectStarterTemplate } from '~/utils/selectStarterTemplate';

describe('selectStarterTemplate untitled default', () => {
  it('uses Untitled Project when title tag is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ text: '<selection><templateName>Expo App</templateName></selection>' }),
      }),
    );

    const result = await selectStarterTemplate({ message: 'mobile app', model: 'x', provider: {} as any });
    expect(result).toEqual({ template: 'Expo App', title: 'Untitled Project' });
  });
});
