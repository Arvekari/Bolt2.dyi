import { describe, expect, it } from 'vitest';
import optimized from '~/lib/common/prompts/optimized';

describe('cycle29 optimized', () => {
  it('mentions supabase-js', () => {
    const prompt = optimized({ cwd: '/tmp', allowedHtmlElements: ['p'], modificationTagName: 'tag' });
    expect(prompt).toContain('@supabase/supabase-js');
  });
});
