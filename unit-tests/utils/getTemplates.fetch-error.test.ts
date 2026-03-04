import { describe, expect, it, vi } from 'vitest';
import { getTemplates } from '~/utils/selectStarterTemplate';

describe('getTemplates fetch errors', () => {
  it('throws when github template fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );

    await expect(getTemplates('Expo App')).rejects.toThrow('HTTP error');
  });
});
