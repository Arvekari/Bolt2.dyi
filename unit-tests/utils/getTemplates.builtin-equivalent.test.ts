import { describe, expect, it, vi } from 'vitest';
import { getTemplates } from '~/utils/selectStarterTemplate';

describe('getTemplates built-in equivalent stacks', () => {
  it('returns built-in express backend files without github fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await getTemplates('Express Backend', 'Express API');

    expect(result?.assistantMessage).toContain('filePath="src/server.js"');
    expect(result?.assistantMessage).toContain('Express backend listening');
    expect(result?.assistantMessage).toContain('title="Express API"');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
