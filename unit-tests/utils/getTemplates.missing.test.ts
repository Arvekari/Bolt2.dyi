import { describe, expect, it } from 'vitest';
import { getTemplates } from '~/utils/selectStarterTemplate';

describe('getTemplates missing template', () => {
  it('returns null for unknown template name', async () => {
    const result = await getTemplates('does-not-exist');
    expect(result).toBeNull();
  });
});
