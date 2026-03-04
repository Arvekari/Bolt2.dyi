import { describe, expect, it, vi } from 'vitest';
import { selectStarterTemplate } from '~/utils/selectStarterTemplate';

describe('selectStarterTemplate fallback', () => {
  it('falls back to blank when template tags are missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ text: '<selection><title>Only title</title></selection>' }),
      }),
    );

    const result = await selectStarterTemplate({ message: 'script', model: 'x', provider: {} as any });
    expect(result).toEqual({ template: 'blank', title: '' });
  });
});
