import { describe, expect, it } from 'vitest';
import { rehypePlugins, remarkPlugins } from '~/utils/markdown';

describe('utils/markdown limited mode', () => {
  it('keeps plugin list stable across calls', () => {
    const a = remarkPlugins(true) as any[];
    const b = remarkPlugins(true) as any[];

    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBe(a.length);
  });

  it('returns empty rehype plugins when html is false', () => {
    expect((rehypePlugins(false) as any[])).toEqual([]);
  });

  it('returns sanitize/raw pipeline when html is true', () => {
    const plugins = rehypePlugins(true) as any[];
    expect(plugins.length).toBeGreaterThan(0);
  });
});
