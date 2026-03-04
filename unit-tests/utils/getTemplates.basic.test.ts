import { describe, expect, it, vi } from 'vitest';
import { getTemplates } from '~/utils/selectStarterTemplate';

describe('getTemplates basic import', () => {
  it('builds assistant/user messages from fetched files', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { name: 'index.ts', path: 'src/index.ts', content: 'console.log(1);' },
          { name: 'ignore', path: '.bolt/ignore', content: 'secret.txt' },
          { name: 'secret.txt', path: 'secret.txt', content: 'x' },
        ],
      }),
    );

    const result = await getTemplates('Expo App', 'My app');
    expect(result?.assistantMessage).toContain('title="My app"');
    expect(result?.userMessage).toContain('READ-ONLY');
  });
});
