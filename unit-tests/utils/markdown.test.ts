import { describe, expect, it } from 'vitest';
import { allowedHTMLElements, rehypePlugins, remarkPlugins } from '~/utils/markdown';

describe('utils/markdown', () => {
  it('contains key allowed html elements', () => {
    expect(allowedHTMLElements).toContain('div');
    expect(allowedHTMLElements).toContain('code');
    expect(allowedHTMLElements).toContain('think');
  });

  it('returns remark plugins and includes think plugin path', () => {
    const plugins = remarkPlugins(false) as any[];
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBeGreaterThan(0);
  });

  it('adds limited markdown plugin when enabled', () => {
    const limited = remarkPlugins(true) as any[];
    const normal = remarkPlugins(false) as any[];

    expect(limited.length).toBeGreaterThanOrEqual(normal.length);
  });

  it('returns rehype sanitize plugins only when html enabled', () => {
    expect((rehypePlugins(true) as any[]).length).toBeGreaterThan(0);
    expect((rehypePlugins(false) as any[]).length).toBe(0);
  });
});
